(function () {
    var REQUEST_TIMEOUT_MS = 20000;
    var pendingRequests = {};
    var requestCounter = 0;
    var parentOrigin = resolveParentOrigin();

    function resolveParentOrigin() {
        try {
            if (document.referrer) {
                var refUrl = new URL(document.referrer, window.location.href);
                if (refUrl.origin && refUrl.origin !== 'null') {
                    return refUrl.origin;
                }
            }
        } catch (err) {}

        try {
            if (window.parent && window.parent.location && window.parent.location.origin && window.parent.location.origin !== 'null') {
                return window.parent.location.origin;
            }
        } catch (err2) {}

        return window.location.origin;
    }

    function nextRequestId(prefix) {
        requestCounter += 1;
        return (prefix || 'arabian') + '_' + Date.now().toString(36) + '_' + requestCounter.toString(36);
    }

    function clearPending(requestId) {
        var record = pendingRequests[requestId];
        if (!record) {
            return;
        }

        if (record.timeoutId) {
            clearTimeout(record.timeoutId);
        }
        delete pendingRequests[requestId];
    }

    function createRequest(type, payload, responseTypes, errorTypes) {
        return new Promise(function (resolve, reject) {
            var requestId = String((payload && payload.requestId) || nextRequestId(type)).trim();
            if (!requestId) {
                reject(new Error('Missing requestId'));
                return;
            }
            if (pendingRequests[requestId]) {
                reject(new Error('Duplicate in-flight request'));
                return;
            }

            var timeoutId = setTimeout(function () {
                clearPending(requestId);
                reject(new Error('Request timed out'));
            }, REQUEST_TIMEOUT_MS);

            pendingRequests[requestId] = {
                resolve: resolve,
                reject: reject,
                responseTypes: responseTypes || [],
                errorTypes: errorTypes || [],
                timeoutId: timeoutId
            };

            try {
                window.parent.postMessage(Object.assign({}, payload, {
                    type: type,
                    requestId: requestId
                }), parentOrigin);
            } catch (err) {
                clearPending(requestId);
                reject(new Error('Unable to post request to parent frame'));
            }
        });
    }

    function handleMessage(event) {
        if (event.source !== window.parent) return;
        if (event.origin !== parentOrigin) return;

        var data = event.data;
        if (!data || typeof data !== 'object') {
            return;
        }

        var requestId = String(data.requestId || '').trim();
        if (!requestId || !pendingRequests[requestId]) {
            return;
        }

        var record = pendingRequests[requestId];
        var messageType = String(data.type || '');
        var isResponse = record.responseTypes.indexOf(messageType) !== -1;
        var isError = record.errorTypes.indexOf(messageType) !== -1 || !!data.error;

        if (!isResponse && !isError) {
            return;
        }

        clearPending(requestId);
        if (isError) {
            record.reject(new Error(String(data.error || 'Request failed')));
            return;
        }

        record.resolve(data);
    }

    window.addEventListener('message', handleMessage);

    /* ── Provably-fair client state (Option A rotating chain) ─────────────── */
    function randomClientSeed() {
        try {
            var a = new Uint8Array(16);
            (window.crypto || window.msCrypto).getRandomValues(a);
            var h = '';
            for (var i = 0; i < a.length; i++) { h += ('0' + a[i].toString(16)).slice(-2); }
            return h;
        } catch (e) { return 'cs' + Date.now().toString(36); }
    }
    function loadClientSeed() {
        try { var v = window.sessionStorage.getItem('arb_client_seed'); if (v && /^[A-Za-z0-9._:-]{1,128}$/.test(v)) { return v; } } catch (e) {}
        return randomClientSeed();
    }
    var clientSeed = loadClientSeed();

    window.BetterdrFairness = {
        game: 'arabian',
        clientSeed: clientSeed,
        state: null,      // { serverSeedHash, nextNonce, symbolWeights, weightsHash, rows, reels, algorithm }
        lastRound: null,  // { serverSeed, clientSeed, nonce, weightsHash, gridHash, pattern, lineCount, coinBet, payoutScale, totalWin, result }
        listeners: [],
        onChange: function (fn) { if (typeof fn === 'function') { this.listeners.push(fn); } },
        emit: function () { for (var i = 0; i < this.listeners.length; i++) { try { this.listeners[i](this); } catch (e) {} } },
        getClientSeed: function () { return clientSeed; },
        setClientSeed: function (value) {
            var v = String(value == null ? '' : value).trim();
            if (!/^[A-Za-z0-9._:-]{1,128}$/.test(v)) { v = randomClientSeed(); }
            clientSeed = v; this.clientSeed = v;
            try { window.sessionStorage.setItem('arb_client_seed', v); } catch (e) {}
            this.emit();
            return v;
        },
        refresh: function () { requestFairnessState(); }
    };

    function requestFairnessState() {
        createRequest('getFairness', {}, ['fairnessState'], []).then(function (msg) {
            if (msg && msg.state) {
                window.BetterdrFairness.state = msg.state;
                if (msg.state.lastRound) { window.BetterdrFairness.lastRound = msg.state.lastRound; }
                window.BetterdrFairness.emit();
            }
        }).catch(function () {});
    }

    function updateFairnessFromResponse(resp) {
        try {
            var f = resp && resp.fairness;
            var rd = resp && resp.roundData;
            if (f && f.serverSeed) {
                window.BetterdrFairness.lastRound = {
                    roundId: resp.roundId || '',
                    serverSeed: f.serverSeed,
                    serverSeedHash: f.serverSeedHash || '',
                    clientSeed: f.clientSeed || '',
                    nonce: Number(f.nonce) || 0,
                    weightsHash: (rd && rd.weightsHash) || '',
                    gridHash: (rd && rd.gridHash) || '',
                    pattern: (rd && rd.pattern) || [],
                    lineCount: (rd && rd.lineCount) || 0,
                    coinBet: (rd && rd.coinBet) || 0,
                    payoutScale: (rd && rd.payoutScale) || 1,
                    bonusPrizeIndex: (rd && rd.bonusPrizeIndex),
                    totalWin: (rd && rd.totalWin) || 0,
                    result: resp.result || ''
                };
                // The next-spin commitment is the just-revealed spin's next hash.
                if (window.BetterdrFairness.state && f.serverSeedHashNext) {
                    window.BetterdrFairness.state.serverSeedHash = String(f.serverSeedHashNext);
                    window.BetterdrFairness.state.nextNonce = (Number(f.nonce) || 0) + 1;
                }
                window.BetterdrFairness.emit();
            }
        } catch (e) {}
    }

    window.BetterdrArabianBridge = {
        createRequestId: nextRequestId,
        getBalance: function () {
            return createRequest('getBalance', {}, ['balanceUpdate'], []);
        },
        settleRound: function (payload, requestId) {
            return createRequest('placeBet', {
                game: 'arabian',
                bets: payload || {},
                requestId: requestId,
                payload: { clientSeed: clientSeed }
            }, ['betResult'], ['betError']).then(function (resp) {
                updateFairnessFromResponse(resp);
                return resp;
            });
        }
    };

    requestFairnessState();
}());
