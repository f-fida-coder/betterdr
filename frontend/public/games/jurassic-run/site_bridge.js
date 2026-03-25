(function () {
    var REQUEST_TIMEOUT_MS = 20000;
    var pendingRequests = {};
    var requestCounter = 0;
    var parentOrigin = resolveParentOrigin();
    var originalFetch = window.fetch.bind(window);

    var GAME_SLUG = 'jurassic-run';
    var DEFAULT_JACKPOT = 10000;
    var FALLBACK_LANGUAGE = {
        please_login: 'Please log in',
        game_deactivated: 'Game is deactivated',
        invalid_bet: 'Invalid bet',
        insufficient_balance: 'Insufficient balance',
        invalid_winnings: 'Invalid winnings',
        invalid_action: 'Invalid action',
        ready: 'Ready',
        label_bet: 'Bet',
        label_message: 'Message',
        label_fs: 'Free Spins',
        label_jackpot: 'Jackpot',
        label_balance: 'Balance',
        btn_audio: 'Audio',
        btn_music: 'Music',
        btn_autoplay: 'Auto',
        btn_play: 'Spin',
        server_request: 'Waiting for server...',
        game_run: 'Game running...',
        win_jackpot: 'Jackpot won!',
        win_fs: 'Free Spins won!',
        win_regular: 'Win',
        lose: 'Unfortunately nothing, try again!',
        paytable_page1_title: 'Paytable',
        paytable_page2_title: 'Paylines',
        paytable_jackpot: 'Jackpot',
        paytable_wild_l1: 'Replaces any',
        paytable_wild_l2: 'symbol except',
        paytable_wild_l3: 'Jackpot and FreeSpin'
    };

    var GAME_CONFIG = {
        gamefile: 'jurassic-run',
        game_name: 'Jurassic Run',
        game_active: true,
        decimals: 0,
        rtp: 95.0,
        volatility: 'medium',
        paylines: 10,
        jackpot_contribution_percent: 5,
        allowed_bets: [1, 5, 10, 50, 100, 200, 400, 500, 1000, 2000, 5000],
        bet_starts: 0,
        symbols: ['1', '2', '3', '4', '5', '6', '7', '8', 'FreeSpin', 'Wild', 'JP'],
        payout_multipliers: {
            sym_1: { c_3: 0.47, c_4: 0.94, c_5: 1.88 },
            sym_2: { c_3: 0.94, c_4: 1.88, c_5: 3.76 },
            sym_3: { c_3: 1.41, c_4: 2.82, c_5: 4.70 },
            sym_4: { c_3: 1.88, c_4: 4.23, c_5: 7.05 },
            sym_5: { c_3: 2.35, c_4: 7.05, c_5: 14.10 },
            sym_6: { c_3: 4.70, c_4: 14.10, c_5: 23.50 },
            sym_7: { c_3: 7.05, c_4: 21.15, c_5: 35.25 },
            sym_8: { c_3: 9.40, c_4: 28.20, c_5: 47.00 },
            sym_FreeSpin: { c_3: 2, c_4: 3, c_5: 4 }
        },
        winlines: [
            [0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
            [0, 0, 1, 2, 2],
            [2, 2, 1, 0, 0],
            [1, 0, 0, 0, 1],
            [1, 2, 2, 2, 1],
            [0, 2, 0, 2, 0]
        ]
    };

    var MAX_AUTOPLAY_SPINS = 100;

    var state = {
        balance: 0,
        betLimits: null,
        freeSpins: 0,
        betId: GAME_CONFIG.bet_starts,
        lockedBetId: null,
        jackpot: DEFAULT_JACKPOT,
        lastRequestId: '',
        spinPending: false,
        autoplayCount: 0
    };

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
        return (prefix || 'jurassic') + '_' + Date.now().toString(36) + '_' + requestCounter.toString(36);
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

    function roundMoney(value) {
        var num = Number(value);
        if (!isFinite(num)) {
            return 0;
        }
        return Math.round(num);
    }

    function normalizePositive(value, fallbackValue) {
        var num = Number(value);
        if (!isFinite(num) || num <= 0) {
            return fallbackValue;
        }
        return roundMoney(num);
    }

    function normalizeBetLimits(payload) {
        var source = payload && typeof payload.betLimits === 'object' && payload.betLimits !== null
            ? payload.betLimits
            : payload || {};

        var gameMinBet = normalizePositive(source.gameMinBet, GAME_CONFIG.allowed_bets[0]);
        var gameMaxBet = normalizePositive(source.gameMaxBet, GAME_CONFIG.allowed_bets[GAME_CONFIG.allowed_bets.length - 1]);
        var accountMinBet = normalizePositive(source.accountMinBet, null);
        var accountMaxBet = normalizePositive(source.accountMaxBet, null);

        var effectiveMinBet = normalizePositive(source.effectiveMinBet, gameMinBet);
        var effectiveMaxBet = normalizePositive(source.effectiveMaxBet, gameMaxBet);

        if (accountMinBet !== null && accountMinBet > effectiveMinBet) {
            effectiveMinBet = accountMinBet;
        }
        if (accountMaxBet !== null && accountMaxBet > 0) {
            effectiveMaxBet = Math.min(effectiveMaxBet, accountMaxBet);
        }
        if (effectiveMaxBet < effectiveMinBet) {
            effectiveMaxBet = effectiveMinBet;
        }

        return {
            accountMinBet: accountMinBet,
            accountMaxBet: accountMaxBet,
            gameMinBet: gameMinBet,
            gameMaxBet: gameMaxBet,
            effectiveMinBet: effectiveMinBet,
            effectiveMaxBet: effectiveMaxBet,
            availableBalance: roundMoney(source.availableBalance != null ? source.availableBalance : state.balance)
        };
    }

    function syncBalancePayload(payload) {
        var balance = Number(payload && (payload.availableBalance != null ? payload.availableBalance : payload.balance));
        if (isFinite(balance)) {
            state.balance = Math.max(0, roundMoney(balance));
        }
        state.betLimits = normalizeBetLimits(payload || {});
        if (payload && payload.gameState && typeof payload.gameState === 'object') {
            var freeSpins = Number(payload.gameState.freeSpinsRemaining);
            if (isFinite(freeSpins)) {
                state.freeSpins = Math.max(0, roundMoney(freeSpins));
            }

            var lockedBetId = Number(payload.gameState.lockedBetId);
            if (isFinite(lockedBetId) && lockedBetId >= 0 && lockedBetId < GAME_CONFIG.allowed_bets.length) {
                state.lockedBetId = roundMoney(lockedBetId);
                state.betId = state.lockedBetId;
            } else if (state.freeSpins <= 0) {
                state.lockedBetId = null;
            }

            var jackpotPool = Number(payload.gameState.jackpotPool);
            if (isFinite(jackpotPool)) {
                state.jackpot = Math.max(0, roundMoney(jackpotPool));
            }
        }
        state.betId = normalizeBetId(state.betId);
    }

    function normalizeBetId(rawBetId) {
        var requested = parseInt(rawBetId, 10);
        if (!isFinite(requested)) {
            requested = state.freeSpins > 0 && state.lockedBetId !== null ? state.lockedBetId : GAME_CONFIG.bet_starts;
        }

        // During free spins the bet is locked — always honour that.
        if (state.freeSpins > 0 && state.lockedBetId !== null) {
            return state.lockedBetId;
        }

        // Only enforce array-bounds. The parent UI already enforces
        // min/max/balance limits on chip display, and the backend does
        // final validation. The bridge must not silently re-map the
        // player's chip selection to a different amount.
        if (requested < 0 || requested >= GAME_CONFIG.allowed_bets.length) {
            return GAME_CONFIG.bet_starts;
        }

        return requested;
    }

    function getRuleAllowedBetIds() {
        var limits = state.betLimits || normalizeBetLimits({});
        var ids = [];
        for (var i = 0; i < GAME_CONFIG.allowed_bets.length; i += 1) {
            var bet = GAME_CONFIG.allowed_bets[i];
            if (bet < limits.effectiveMinBet || bet > limits.effectiveMaxBet) {
                continue;
            }
            ids.push(i);
        }

        if (ids.length === 0) {
            ids.push(GAME_CONFIG.bet_starts);
        }

        return ids;
    }

    function getCurrentBet() {
        var id = state.betId;
        if (id < 0 || id >= GAME_CONFIG.allowed_bets.length) {
            id = GAME_CONFIG.bet_starts;
        }
        return GAME_CONFIG.allowed_bets[id] || GAME_CONFIG.allowed_bets[0];
    }

    function buildLoadPayload() {
        state.betId = normalizeBetId(state.betId);
        return {
            betId: state.betId,
            bet: getCurrentBet(),
            userBalance: state.balance,
            jackpot: state.jackpot,
            freeSpins: state.freeSpins
        };
    }

    function buildResponse(data, status) {
        return Promise.resolve(new Response(JSON.stringify(data), {
            status: status || 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }));
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
                reject(new Error('Unable to contact casino host'));
            }
        });
    }

    function handleMessage(event) {
        if (event.source !== window.parent) return;
        // For cross-origin iframes, verify origin matches; same-origin is safe via source check
        if (parentOrigin !== window.location.origin && event.origin !== parentOrigin) return;

        var data = event.data;
        if (!data || typeof data !== 'object') {
            return;
        }

        if (String(data.type || '') === 'balanceUpdate') {
            syncBalancePayload(data);
        }

        if (String(data.type || '') === 'parentSetBet') {
            var newBetId = parseInt(data.betId, 10);
            if (isFinite(newBetId) && newBetId >= 0 && newBetId < GAME_CONFIG.allowed_bets.length) {
                // Trust the parent's chip selection directly — the parent UI
                // already enforces min/max/balance limits on chip display.
                state.betId = newBetId;
            }
            if (typeof betUpdate === 'function') {
                betUpdate(buildLoadPayload());
            }
            try {
                window.parent.postMessage({
                    type: 'betConfirmed',
                    betId: state.betId,
                    bet: getCurrentBet()
                }, parentOrigin);
            } catch (e) {}
            return;
        }

        if (String(data.type || '') === 'parentTriggerSpin') {
            if (!state.spinPending && typeof PressPlay === 'function') {
                PressPlay();
            }
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

    function requestBalance() {
        return createRequest('getBalance', {}, ['balanceUpdate'], []);
    }

    function settleRound(payload, requestId) {
        return createRequest('placeBet', {
            game: GAME_SLUG,
            bets: payload || {},
            requestId: requestId
        }, ['betResult'], ['betError']);
    }

    function getLanguagePack() {
        return FALLBACK_LANGUAGE;
    }

    function getActionParams(init) {
        var body = init && init.body;
        var params = new URLSearchParams();

        if (!body) {
            return params;
        }
        if (typeof body === 'string') {
            return new URLSearchParams(body);
        }
        if (body instanceof URLSearchParams) {
            body.forEach(function (value, key) {
                params.append(key, value);
            });
            return params;
        }
        return params;
    }

    function handleLoadConfig() {
        return {
            symbols: GAME_CONFIG.symbols.slice(),
            decimals: GAME_CONFIG.decimals,
            payout_multipliers: GAME_CONFIG.payout_multipliers,
            language: getLanguagePack(),
            langcode: String(window.langcode || 'en'),
            winlines: GAME_CONFIG.winlines.slice()
        };
    }

    function handleLoad() {
        state.autoplayCount = 0;
        return requestBalance().then(function (payload) {
            syncBalancePayload(payload);
            return buildLoadPayload();
        });
    }

    function handleChangeBet(params) {
        state.betId = normalizeBetId(params.get('betId'));

        if (state.freeSpins > 0 && state.lockedBetId !== null) {
            state.betId = state.lockedBetId;
            return buildLoadPayload();
        }

        var typ = String(params.get('typ') || '');
        var allowedBetIds = getRuleAllowedBetIds();
        var currentIdx = allowedBetIds.indexOf(state.betId);
        if (currentIdx === -1) {
            currentIdx = 0;
            state.betId = allowedBetIds[0];
        }

        if (typ === 'betless' && currentIdx > 0) {
            state.betId = allowedBetIds[currentIdx - 1];
        } else if (typ === 'betmore' && currentIdx < allowedBetIds.length - 1) {
            state.betId = allowedBetIds[currentIdx + 1];
        }

        return buildLoadPayload();
    }

    function convertRoundToVendorPayload(resp, requestId) {
        var roundData = resp && typeof resp.roundData === 'object' && resp.roundData !== null ? resp.roundData : {};
        var availableAfter = Number(resp && (resp.availableBalanceAfter != null ? resp.availableBalanceAfter : resp.availableBalance));
        var availableBefore = Number(resp && (resp.availableBalanceBefore != null ? resp.availableBalanceBefore : resp.balanceBefore));
        var jackpotBefore = Number(roundData.jackpotBefore);
        var jackpotAfter = Number(roundData.jackpotAfter);
        var freeSpinsAfter = Number(roundData.freeSpinsAfter);
        var freeSpinsBefore = Number(roundData.freeSpinsBefore);
        var betId = parseInt(roundData.betId, 10);

        if (isFinite(availableAfter)) {
            state.balance = Math.max(0, roundMoney(availableAfter));
        }
        if (resp && typeof resp.betLimits === 'object' && resp.betLimits !== null) {
            state.betLimits = normalizeBetLimits({
                balance: state.balance,
                availableBalance: state.balance,
                betLimits: resp.betLimits
            });
        }
        if (isFinite(jackpotAfter)) {
            state.jackpot = Math.max(0, roundMoney(jackpotAfter));
        }
        if (isFinite(freeSpinsAfter)) {
            state.freeSpins = Math.max(0, roundMoney(freeSpinsAfter));
        }
        if (isFinite(betId)) {
            state.betId = normalizeBetId(betId);
        }
        state.lockedBetId = state.freeSpins > 0 ? state.betId : null;
        state.lastRequestId = requestId;

        return {
            symbols: Array.isArray(roundData.symbols) ? roundData.symbols : [],
            winnings: roundMoney(roundData.slotWin != null ? roundData.slotWin : roundData.lineWin),
            winningLines: Array.isArray(roundData.winningLines) ? roundData.winningLines : [],
            freeSpinsWon: roundMoney(roundData.freeSpinsWon != null ? roundData.freeSpinsWon : roundData.freeSpinsAwarded),
            jackpotWon: roundMoney(roundData.jackpotWon),
            userBalanceBefore: isFinite(availableBefore) ? roundMoney(availableBefore) : state.balance,
            userBalanceAfter: isFinite(availableAfter) ? roundMoney(availableAfter) : state.balance,
            jackpotBefore: isFinite(jackpotBefore) ? roundMoney(jackpotBefore) : state.jackpot,
            jackpotAfter: isFinite(jackpotAfter) ? roundMoney(jackpotAfter) : state.jackpot,
            freeSpinsBefore: isFinite(freeSpinsBefore) ? roundMoney(freeSpinsBefore) : 0,
            freeSpinsAfter: isFinite(freeSpinsAfter) ? roundMoney(freeSpinsAfter) : state.freeSpins
        };
    }

    function shouldStopAutoplay() {
        return state.autoplayCount >= MAX_AUTOPLAY_SPINS;
    }

    function handleGame(params) {
        if (state.spinPending) {
            return Promise.reject(new Error('Spin already in progress'));
        }

        state.betId = normalizeBetId(params.get('betId'));
        var requestId = nextRequestId('jurassic_spin');
        var bet = getCurrentBet();
        var payload = {
            betId: state.betId,
            bet: bet
        };

        if (state.freeSpins === 0 && state.balance < bet) {
            return Promise.reject(new Error(FALLBACK_LANGUAGE.insufficient_balance));
        }

        state.spinPending = true;
        state.autoplayCount += 1;
        return settleRound(payload, requestId)
            .then(function (resp) {
                var result = convertRoundToVendorPayload(resp, requestId);
                // Stop autoplay on bonus trigger (free spins or jackpot)
                if (result.freeSpinsWon > 0 || result.jackpotWon) {
                    if (typeof stopAutoplay === 'function') stopAutoplay();
                }
                // Stop autoplay after max spins
                if (shouldStopAutoplay()) {
                    if (typeof stopAutoplay === 'function') stopAutoplay();
                }
                return result;
            })
            .finally(function () {
                state.spinPending = false;
            });
    }

    function interceptRemote(resource, init) {
        var url = '';
        if (typeof resource === 'string') {
            url = resource;
        } else if (resource && typeof resource.url === 'string') {
            url = resource.url;
        }

        try {
            url = new URL(url, window.location.href).pathname;
        } catch (err) {}

        if (!/\/?remote\.php$/i.test(url)) {
            return null;
        }

        var params = getActionParams(init);
        var action = String(params.get('action') || '').trim().toLowerCase();
        var promise;

        if (action === 'loadconfig') {
            promise = Promise.resolve(handleLoadConfig());
        } else if (action === 'load') {
            promise = handleLoad();
        } else if (action === 'changebet') {
            promise = Promise.resolve(handleChangeBet(params));
        } else if (action === 'game') {
            promise = handleGame(params);
        } else {
            promise = Promise.resolve({ error: FALLBACK_LANGUAGE.invalid_action });
        }

        return promise
            .then(function (data) {
                return buildResponse(data, 200);
            })
            .catch(function (err) {
                return buildResponse({
                    error: String((err && err.message) || 'Game request failed')
                }, 200);
            });
    }

    window.addEventListener('message', handleMessage);

    window.fetch = function (resource, init) {
        var intercepted = interceptRemote(resource, init || {});
        if (intercepted) {
            return intercepted;
        }
        return originalFetch(resource, init);
    };
}());
