/*
 * Betterdr site bridge for baccarat-classic (BAC HTML5 table client).
 *
 * Replaces the vendor .aspx transport (web-connector.js, ms-server-connector.js,
 * ms-heartbeat-manager.js, ms-cashier-v3.5.js — none of which ship). Every
 * server interaction goes to the parent CasinoView via postMessage; the parent
 * holds the JWT and calls the platform API. The round outcome (cards, totals,
 * result, payout, balance) is decided entirely server-side — this file only
 * copies the server's answer into the globals bac.js renders from.
 */
(function () {
    'use strict';

    var GAME_SLUG = 'baccarat-classic';
    var REQUEST_TIMEOUT_MS = 20000;
    // The game is served from the site's own origin, so the parent's origin
    // equals ours. Never post to or accept from anywhere else.
    var PARENT_ORIGIN = window.location.origin;

    var pendingRequests = {};
    var requestSeq = 0;

    function createRequestId() {
        requestSeq += 1;
        return 'bacc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10) + '_' + requestSeq;
    }

    /* ── provably-fair client state ───────────────────────────────────── */

    // Fresh, UNPREDICTABLE client seed generated in-browser at session start
    // (32 hex chars of CSPRNG). Persisted per tab session so a player can keep a
    // stable seed across rounds, and editable from the fairness panel. Never a
    // server-supplied constant; if the player clears it we regenerate randomly.
    function randomClientSeed() {
        var bytes = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        var hex = '';
        for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
        return hex;
    }
    function loadClientSeed() {
        var stored = '';
        try { stored = window.sessionStorage.getItem('bacc_client_seed') || ''; } catch (e) {}
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(stored)) {
            stored = randomClientSeed();
            try { window.sessionStorage.setItem('bacc_client_seed', stored); } catch (e) {}
        }
        return stored;
    }
    var clientSeed = loadClientSeed();

    // window.BetterdrFairness — read/observed by the fairness panel. Holds the
    // current commitment (next-round serverSeedHash) and the last revealed round.
    window.BetterdrFairness = {
        clientSeed: clientSeed,
        state: null,       // { serverSeedHash, nextNonce, shoeSize, algorithm }
        lastRound: null,   // { serverSeed, clientSeed, nonce, shoeSize, deckHash, playerCards, bankerCards, result }
        listeners: [],
        onChange: function (fn) { if (typeof fn === 'function') this.listeners.push(fn); },
        emit: function () {
            for (var i = 0; i < this.listeners.length; i++) {
                try { this.listeners[i](this); } catch (e) {}
            }
        },
        getClientSeed: function () { return clientSeed; },
        setClientSeed: function (value) {
            var v = String(value == null ? '' : value).trim();
            if (!/^[A-Za-z0-9._:-]{1,128}$/.test(v)) v = randomClientSeed();
            clientSeed = v;
            this.clientSeed = v;
            try { window.sessionStorage.setItem('bacc_client_seed', v); } catch (e) {}
            this.emit();
            return v;
        },
        refresh: function () { requestFairnessState(); }
    };

    function requestFairnessState() {
        return request('getFairness', {}, ['fairnessState'], []).then(function (msg) {
            if (msg && msg.state) {
                window.BetterdrFairness.state = msg.state || null;
                if (msg.state && msg.state.lastRound) window.BetterdrFairness.lastRound = msg.state.lastRound;
                window.BetterdrFairness.emit();
            }
        }).catch(function () { /* panel simply shows what it has */ });
    }

    function sendToParent(message) {
        try {
            window.parent.postMessage(message, PARENT_ORIGIN);
        } catch (err) { /* parent gone — nothing to do */ }
    }

    function request(type, extra, successTypes, errorTypes) {
        return new Promise(function (resolve, reject) {
            var requestId = createRequestId();
            var timer = setTimeout(function () {
                delete pendingRequests[requestId];
                reject(new Error('Timed out waiting for the casino server. Please try again.'));
            }, REQUEST_TIMEOUT_MS);
            pendingRequests[requestId] = {
                successTypes: successTypes,
                errorTypes: errorTypes,
                resolve: function (msg) { clearTimeout(timer); delete pendingRequests[requestId]; resolve(msg); },
                reject: function (msg) {
                    clearTimeout(timer);
                    delete pendingRequests[requestId];
                    reject(new Error(String((msg && msg.error) || 'Casino request failed.')));
                }
            };
            var payload = { type: type, requestId: requestId };
            for (var key in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, key)) payload[key] = extra[key];
            }
            sendToParent(payload);
        });
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return;
        if (event.origin !== PARENT_ORIGIN) return;
        var msg = event.data;
        if (!msg || typeof msg !== 'object' || !msg.type) return;
        var pending = msg.requestId ? pendingRequests[msg.requestId] : null;
        if (!pending) {
            // Unsolicited balance sync from the parent (e.g. after it refreshes
            // the wallet) — apply unless a hand is mid-flight.
            if (msg.type === 'balanceUpdate' && !msg.error && window.GameStatus !== 'Dealing') {
                applyBalancePayload(msg);
                if (typeof window.UpdateVisualBalance === 'function' && window.GameStatus !== 'ShowingGame') {
                    try { window.UpdateVisualBalance(Global.Connector.bal); } catch (err) {}
                }
            }
            return;
        }
        // The parent reports balance failures as balanceUpdate + error field.
        if (msg.error && pending.successTypes.indexOf(msg.type) !== -1) {
            pending.reject(msg);
            return;
        }
        if (pending.successTypes.indexOf(msg.type) !== -1) pending.resolve(msg);
        else if (pending.errorTypes.indexOf(msg.type) !== -1) pending.reject(msg);
    });

    function toFiniteNumber(value) {
        var num = Number(value);
        return isFinite(num) ? num : null;
    }

    // Credit-aware playable balance, matching what the parent header shows.
    function resolveBalance(msg) {
        var fields = ['availableBalance', 'newBalance', 'playableBalance', 'walletBalance', 'balance', 'availableBalanceAfter', 'balanceAfter'];
        for (var i = 0; i < fields.length; i++) {
            var num = toFiniteNumber(msg[fields[i]]);
            if (num !== null) return num;
        }
        return null;
    }

    function applyBalancePayload(msg) {
        var balance = resolveBalance(msg);
        if (balance !== null) Global.Connector.bal = balance;
        var minBet = toFiniteNumber(msg.gameMinBet) !== null ? toFiniteNumber(msg.gameMinBet) : toFiniteNumber(msg.minBet);
        var maxBet = toFiniteNumber(msg.gameMaxBet) !== null ? toFiniteNumber(msg.gameMaxBet) : toFiniteNumber(msg.maxBet);
        if (minBet !== null && minBet > 0) Global.Connector.minb = minBet;
        if (maxBet !== null && maxBet > 0) Global.Connector.maxb = maxBet;
        applyPayoutConfig(msg.payoutConfig);
    }

    // Single source for displayed payout numbers: the server's clamped
    // effective config (balanceUpdate) and, after every round, the exact
    // values that round settled with (betResult.payoutApplied). Nothing is
    // hardcoded here — display can never drift from what actually pays.
    function applyPayoutConfig(config) {
        if (!config || typeof config !== 'object') return;
        var commission = toFiniteNumber(config.bankerCommissionPct);
        var tiePayout = toFiniteNumber(config.tiePayout);
        if (commission !== null) Global.BAC.comm = commission.toFixed(2);
        if (tiePayout !== null) {
            Global.BAC.TiePercentage = String(tiePayout);
            try {
                if (typeof window.UpdateTiePays === 'function') window.UpdateTiePays();
            } catch (err) { /* label refresh only — never blocks play */ }
        }
    }

    // Baccarat point value of a client card code 1-52 (rank blocks A,2..10,J,Q,K).
    function cardPoint(code) {
        var rankIdx = (Number(code) - 1) % 13;
        if (rankIdx === 0) return 1;      // Ace
        if (rankIdx >= 9) return 0;       // 10, J, Q, K
        return rankIdx + 1;               // 2-9
    }

    function twoCardTotal(cards) {
        if (!cards || cards.length < 2) return 0;
        return (cardPoint(cards[0]) + cardPoint(cards[1])) % 10;
    }

    /* ── connector API consumed by bac.js ─────────────────────────────── */

    window.InitAction = {
        GameSession: null,
        LastGameId: 0,
        doInitAction: function (callback) {
            // Platform policy: wallet, history and stats live in the site UI,
            // not inside the game. Force those vendor surfaces off no matter
            // what the launch URL says.
            Global.Connector.showCashier = false;
            Global.Connector.showHistory = false;
            Global.Connector.availableBalance = '';
            if (typeof Global.Connector.showChips !== 'string' || Global.Connector.showChips === '') {
                Global.Connector.showChips = '1,5,25,100,500';
            }
            // Payout numbers (commission %, tie multiplier) are NOT set here —
            // they arrive in balanceUpdate.payoutConfig from the same
            // server-clamped config the payout engine settles with.

            request('getBalance', {}, ['balanceUpdate'], ['balanceError']).then(function (msg) {
                applyBalancePayload(msg);
                // Fetch the current commitment BEFORE the game becomes playable.
                // The server creates the seed chain on this call, and the bet
                // path loud-fails if the chain is missing — so the first deal
                // must not be possible until this resolves.
                return requestFairnessState();
            }).then(function () {
                if (typeof callback === 'function') callback();
            }).catch(function (err) {
                showErrorMessage(err.message || 'Unable to load your balance. Please close and reopen the game.');
            });
        }
    };

    window.DealAction = {
        dealPlayerBet: null,
        dealBankerBet: null,
        dealTieBet: null,
        GameSession: null,
        DoDealAction: function (callback) {
            var bets = {
                Player: toFiniteNumber(this.dealPlayerBet) > 0 ? toFiniteNumber(this.dealPlayerBet) : 0,
                Banker: toFiniteNumber(this.dealBankerBet) > 0 ? toFiniteNumber(this.dealBankerBet) : 0,
                Tie: toFiniteNumber(this.dealTieBet) > 0 ? toFiniteNumber(this.dealTieBet) : 0
            };
            // clientSeed rides in payload; the parent forwards it to /casino/bet.
            // The server uses its authoritative nonce (prior-round count) — the
            // client cannot pick a favorable one.
            request('placeBet', { game: GAME_SLUG, bets: bets, payload: { clientSeed: clientSeed } }, ['betResult'], ['betError']).then(function (msg) {
                applyDealResult(msg);
                if (typeof callback === 'function') callback();
            }).catch(function (err) {
                // Nothing was booked (or the parent already refunded the error
                // path server-side rejected) — put the table back into betting.
                window.GameStatus = 'Betting';
                try {
                    $('#btn-deal').show();
                    $('#btn-clear').show();
                } catch (uiErr) {}
                showErrorMessage(err.message || 'Bet failed. Please try again.');
            });
        }
    };

    function applyDealResult(msg) {
        var playerCodes = Array.isArray(msg.playerCardCodes) ? msg.playerCardCodes : [];
        var bankerCodes = Array.isArray(msg.bankerCardCodes) ? msg.bankerCardCodes : [];

        // bac.js renders images/Cards/<value>.png from these string values —
        // the codes come straight from the server's settled round.
        Global.BAC.PlayerCards = [];
        Global.BAC.BankerCards = [];
        for (var p = 0; p < playerCodes.length; p++) Global.BAC.PlayerCards[p] = String(playerCodes[p]);
        for (var b = 0; b < bankerCodes.length; b++) Global.BAC.BankerCards[b] = String(bankerCodes[b]);

        // [0] = two-card total (the "Player has X" callout while dealing),
        // [1] = server-authoritative final total.
        Global.BAC.PlayerResults = [String(twoCardTotal(playerCodes)), String(toFiniteNumber(msg.playerTotal) !== null ? msg.playerTotal : '')];
        Global.BAC.BankerResults = [String(twoCardTotal(bankerCodes)), String(toFiniteNumber(msg.bankerTotal) !== null ? msg.bankerTotal : '')];

        // rslt semantics from the vendor protocol: net balance delta for the
        // whole round. bankerrslt: net win on the banker bet alone.
        Global.BAC.Result = toFiniteNumber(msg.netResult) !== null ? toFiniteNumber(msg.netResult) : 0;
        Global.BAC.BankerResult = (String(msg.result) === 'Banker' && toFiniteNumber(msg.profit) !== null)
            ? toFiniteNumber(msg.profit)
            : 0;

        Global.Connector.lastGameId = String(msg.roundId || '');
        applyBalancePayload(msg);
        // Sync the displayed payout numbers to what THIS round settled with.
        applyPayoutConfig(msg.payoutApplied);

        // Provably-fair: record this round's reveal, and update the commitment
        // for the NEXT round (serverSeedHashNext) so the panel always shows the
        // hash of the seed the upcoming round will use.
        if (msg.fairness) {
            var f = msg.fairness;
            window.BetterdrFairness.lastRound = {
                roundId: String(msg.roundId || ''),
                serverSeed: f.serverSeed,
                serverSeedHash: f.serverSeedHash,
                clientSeed: f.clientSeed,
                nonce: f.nonce,
                shoeSize: f.shoeSize,
                deckHash: f.deckHash,
                playerCards: Array.isArray(msg.playerCardCodes) ? msg.playerCardCodes.slice() : [],
                bankerCards: Array.isArray(msg.bankerCardCodes) ? msg.bankerCardCodes.slice() : [],
                result: String(msg.result || '')
            };
            window.BetterdrFairness.state = {
                serverSeedHash: f.serverSeedHashNext,
                nextNonce: (Number(f.nonce) || 0) + 1,
                shoeSize: f.shoeSize,
                algorithm: (window.BetterdrFairness.state && window.BetterdrFairness.state.algorithm) || 'commit-reveal-hmac-v1'
            };
            window.BetterdrFairness.emit();
        }
    }

    /* ── vendor modules replaced with platform-safe stubs ──────────────── */

    // Periodic wallet re-sync in place of the vendor keep-alive. Skips while a
    // hand is animating so the credits meter never jumps ahead of the cards.
    window.HeartbeatManager = {
        callbackAfterHeartbeat: null,
        initHeartbeat: function (gameSessionInput, callback) {
            this.callbackAfterHeartbeat = callback || null;
            var self = this;
            var intervalMs = (typeof TimeHeartBeatCall !== 'undefined' && Number(TimeHeartBeatCall) > 0) ? Number(TimeHeartBeatCall) : 30000;
            setInterval(function () {
                if (window.GameStatus === 'Dealing') return;
                request('getBalance', {}, ['balanceUpdate'], ['balanceError']).then(function (msg) {
                    applyBalancePayload(msg);
                    if (typeof self.callbackAfterHeartbeat === 'function') self.callbackAfterHeartbeat();
                }).catch(function () { /* transient — next tick retries */ });
            }, intervalMs);
        },
        setLastServerCall: function () {}
    };

    // The platform wallet replaces the in-game cashier entirely.
    window.cashierManager = {
        cashierCreator: function () {},
        openCashier: function () {}
    };

    window.ServerManager = {
        // Translations are a static bundled asset now — same XML the vendor
        // endpoint served, parsed the same way (var/field id -> text).
        doGetLanguageAction: function (callback1, callback2) {
            $.ajax({
                type: 'GET',
                url: 'lang/en.xml',
                dataType: 'xml',
                cache: true,
                success: function (xml) {
                    try {
                        $(xml).find('language-string-table').each(function () {
                            $(this).find('var').each(function () {
                                Global.Language.translations[$(this).attr('id')] = $(this).text();
                            });
                            $(this).find('field').each(function () {
                                Global.Language.translations[$(this).attr('id')] = $(this).text();
                            });
                        });
                    } catch (err) {}
                    if (typeof callback1 === 'function') callback1(callback2);
                    sendToParent({ type: 'gameReady' });
                },
                error: function () {
                    // English UI labels are baked into the markup as fallbacks;
                    // missing translations must never block the game.
                    if (typeof callback1 === 'function') callback1(callback2);
                    sendToParent({ type: 'gameReady' });
                }
            });
        },
        doMessageAction: function () {},
        doChiptransferInitAction: function () {},
        doChiptransferBuyInAction: function () {},
        doChiptransferCashOutAction: function () {}
    };

    // web-connector.js used to define these parent-window helpers.
    window.UpdateBalanceWrapper = function () {};
    window.UpdatePorcentage = function () {};
    window.CloseWrapperGame = function () { return false; };

    // The site overlay provides exit + history + wallet; hide the in-game
    // duplicates (SHOWCASHIER/SHOWHISTORY launch params also disable them —
    // this is the belt to that suspender).
    $(function () {
        $('#closeButton, #historyButton, #cashierButton').hide();
    });
})();
