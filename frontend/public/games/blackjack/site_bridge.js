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

        return '*';
    }

    function nextRequestId(prefix) {
        requestCounter += 1;
        return (prefix || 'blackjack') + '_' + Date.now().toString(36) + '_' + requestCounter.toString(36);
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
        if (parentOrigin !== '*' && event.origin !== parentOrigin) return;

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

    window.BetterdrBlackjackBridge = {
        createRequestId: nextRequestId,
        getBalance: function () {
            return createRequest('getBalance', {}, ['balanceUpdate'], []);
        },
        settleRound: function (payload, requestId) {
            return createRequest('placeBet', {
                game: 'blackjack',
                bets: payload || {},
                requestId: requestId
            }, ['betResult'], ['betError']);
        }
    };
}());
