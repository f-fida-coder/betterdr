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
        return (prefix || 'craps') + '_' + Date.now().toString(36) + '_' + requestCounter.toString(36);
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

            window.parent.postMessage(Object.assign({}, payload, {
                type: type,
                requestId: requestId
            }), parentOrigin);
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

    function buildPayload(mode, payload, requestId) {
        var nextPayload = payload || {};
        return {
            game: 'craps',
            bets: nextPayload.bets || {},
            requestId: requestId,
            payload: {
                mode: mode,
                state: nextPayload.state || '',
                pointNumber: nextPayload.pointNumber === undefined ? null : nextPayload.pointNumber
            }
        };
    }

    window.BetterdrCrapsBridge = {
        createRequestId: nextRequestId,
        getBalance: function () {
            return createRequest('getBalance', {}, ['balanceUpdate'], []);
        },
        settleRound: function (payload, requestId) {
            return createRequest('placeBet', buildPayload('roll', payload, requestId), ['betResult'], ['betError']);
        },
        syncState: function (payload, requestId) {
            var mode = String((payload && payload.mode) || 'sync').trim().toLowerCase();
            if (mode !== 'snapshot') {
                mode = 'sync';
            }
            return createRequest('placeBet', buildPayload(mode, payload, requestId), ['betResult'], ['betError']);
        }
    };
}());
