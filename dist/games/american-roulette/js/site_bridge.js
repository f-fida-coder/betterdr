/*
 * Betterdr site bridge for American Roulette (rl HTML5 client).
 *
 * Replaces the offline mock server (this build ships NO mock-server.js and NO
 * aspnet tree). It provides window.Server — the game's only transport seam —
 * and translates the vendor Init/Spin/Heartbeat wire protocol to the parent
 * CasinoView postMessage API. The parent holds the JWT and calls the platform
 * API; this iframe never sees a token.
 *
 * SECURITY BOUNDARY: this file contains no RNG, no payout table and no
 * balance arithmetic. The winning pocket, net result and balance below are
 * copied verbatim from the server's settled answer into the key=value wire
 * format the game parses. Bet codes are translated 1:1 to typed bets; the
 * server re-validates every one against its own layout tables and rejects
 * anything invalid.
 */
(function () {
    'use strict';

    var GAME_SLUG = 'american-roulette';
    var REQUEST_TIMEOUT_MS = 20000;
    // Served from the site's own origin; never post to or accept from others.
    var PARENT_ORIGIN = window.location.origin;

    /* ── provably-fair client state ──────────────────────────────────────── */

    // Fresh, UNPREDICTABLE client seed generated in-browser at session start
    // (32 hex chars of CSPRNG). Persisted per tab session so a player keeps a
    // stable seed across spins, and editable from the fairness panel. Never a
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
        try { stored = window.sessionStorage.getItem('arl_client_seed') || ''; } catch (e) {}
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(stored)) {
            stored = randomClientSeed();
            try { window.sessionStorage.setItem('arl_client_seed', stored); } catch (e) {}
        }
        return stored;
    }
    var clientSeed = loadClientSeed();

    // window.BetterdrFairness — read/observed by the fairness panel. Holds the
    // current commitment (next-spin serverSeedHash) and the last revealed spin.
    window.BetterdrFairness = {
        game: GAME_SLUG,
        clientSeed: clientSeed,
        state: null,       // { serverSeedHash, nextNonce, pockets, algorithm }
        lastRound: null,   // { serverSeed, clientSeed, nonce, number, winningBetKeys, totalWager, totalReturn }
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
            try { window.sessionStorage.setItem('arl_client_seed', v); } catch (e) {}
            this.emit();
            return v;
        },
        refresh: function () { requestFairnessState(); }
    };

    function requestFairnessState() {
        request('getFairness', {}, ['fairnessState'], [], function (msg) {
            if (msg && msg.state) {
                window.BetterdrFairness.state = msg.state;
                if (msg.state.lastRound) window.BetterdrFairness.lastRound = msg.state.lastRound;
                window.BetterdrFairness.emit();
            }
        }, function () { /* fairness display refresh only */ });
    }

    /* ── parent messaging (same machinery as the other in-house games) ──── */

    var pendingRequests = {};
    var requestSeq = 0;

    function createRequestId() {
        requestSeq += 1;
        return 'arl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10) + '_' + requestSeq;
    }

    function postToParent(message) {
        try { window.parent.postMessage(message, PARENT_ORIGIN); } catch (e) {}
    }

    function request(type, payload, acceptTypes, rejectTypes, onOk, onFail) {
        var requestId = createRequestId();
        var timer = setTimeout(function () {
            if (!pendingRequests[requestId]) return;
            delete pendingRequests[requestId];
            onFail({ error: 'The server took too long to respond. Please try again.' });
        }, REQUEST_TIMEOUT_MS);
        pendingRequests[requestId] = {
            accept: acceptTypes,
            reject: rejectTypes,
            ok: function (msg) { clearTimeout(timer); onOk(msg); },
            fail: function (msg) { clearTimeout(timer); onFail(msg); }
        };
        var message = { type: type, game: GAME_SLUG, requestId: requestId };
        for (var k in payload) { if (payload.hasOwnProperty(k)) message[k] = payload[k]; }
        postToParent(message);
    }

    var lastWallet = { balance: null, betLimits: null, payoutConfig: null };

    function rememberWallet(msg) {
        if (typeof msg.availableBalance === 'number') lastWallet.balance = msg.availableBalance;
        else if (typeof msg.balance === 'number') lastWallet.balance = msg.balance;
        if (msg.betLimits && typeof msg.betLimits === 'object') lastWallet.betLimits = msg.betLimits;
        if (msg.payoutConfig && typeof msg.payoutConfig === 'object') lastWallet.payoutConfig = msg.payoutConfig;
    }

    /* ── operational config (server-clamped; display derivation only) ─────
     * The parent forwards casinogames.metadata.payoutConfig — already passed
     * through the server's clamp — on every balanceUpdate. The SAME values
     * gate every spin server-side; everything here only mirrors them so the
     * caps the table shows are the caps the server enforces. Defaults below
     * equal the server spec defaults. */
    function configNumber(key, fallback) {
        var cfg = lastWallet.payoutConfig || {};
        var n = Number(cfg[key]);
        return isFinite(n) && n > 0 ? Math.round(n) : fallback;
    }

    function buildLimitFields() {
        var fiveBetOn = 1;
        var cfg = lastWallet.payoutConfig;
        if (cfg && cfg.fiveBetEnabled != null && isFinite(Number(cfg.fiveBetEnabled))) {
            fiveBetOn = Math.round(Number(cfg.fiveBetEnabled)) >= 1 ? 1 : 0;
        }
        return '&max_su=' + configNumber('maxStraight', 25)
            + '&max_sp=' + configNumber('maxSplit', 50)
            + '&max_st=' + configNumber('maxStreet', 75)
            + '&max_tz=' + configNumber('maxBasket', 75)
            + '&max_cn=' + configNumber('maxCorner', 100)
            + '&max_ff=' + configNumber('maxFiveBet', 125)
            + '&max_sx=' + configNumber('maxSixLine', 150)
            + '&max_out=' + configNumber('maxOutside', 100)
            + '&fivebet=' + fiveBetOn;
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return;
        if (event.origin !== PARENT_ORIGIN) return;
        var msg = event.data;
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        if (msg.type === 'balanceUpdate') rememberWallet(msg);

        var requestId = String(msg.requestId || '');
        var pending = requestId && pendingRequests[requestId];
        if (!pending) return;
        if (pending.accept.indexOf(msg.type) >= 0) {
            delete pendingRequests[requestId];
            pending.ok(msg);
        } else if (pending.reject.indexOf(msg.type) >= 0) {
            delete pendingRequests[requestId];
            pending.fail(msg);
        }
    });

    /* ── wire helpers ────────────────────────────────────────────────────── */

    // Values ride the game's naive split('&')/split('=') parser — strip both
    // delimiters from free-form text, then URI-encode (the game decodes ERRD).
    function wireError(message) {
        var text = String(message == null ? 'Bet failed. Please try again.' : message).replace(/[&=]/g, ' ');
        return 'iserr=1&errd=' + encodeURIComponent(text);
    }

    function moneyStr(value) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function parseBody(data) {
        var out = {};
        if (!data) return out;
        String(data).split('&').forEach(function (kv) {
            var i = kv.indexOf('=');
            if (i < 0) { out[kv] = ''; return; }
            out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
        });
        return out;
    }

    /* ── bet-code translation (vendor wire code -> typed platform bet) ───── */

    // Meta/session fields the spin body carries that are not bets.
    var NON_BET_FIELDS = { GameSession: 1, iseuro: 1, lastgameid: 1, rand: 1 };

    // Returns {type, value} or null for an unrecognized code. Amounts and
    // payouts are NOT decided here — the server owns both.
    function betFromCode(code) {
        var m;
        if ((m = code.match(/^su(00|\d{1,2})$/))) return { type: 'straight', value: m[1] };
        if ((m = code.match(/^sp(00|\d{1,2})_(00|\d{1,2})$/))) return { type: 'split', value: m[1] + '_' + m[2] };
        if ((m = code.match(/^st(\d{1,2})$/))) return { type: 'street', value: m[1] };
        if ((m = code.match(/^cn(\d{1,2})$/))) return { type: 'corner', value: m[1] };
        if ((m = code.match(/^sx(\d{1,2})$/))) return { type: 'sixline', value: m[1] };
        if (code === 'tz') return { type: 'basket', value: '0_00_2' };
        if (code === 'ff') return { type: 'fivebet', value: '0_00_1_2_3' };
        if (code === 'dz1') return { type: 'dozen', value: 'first' };
        if (code === 'dz2') return { type: 'dozen', value: 'second' };
        if (code === 'dz3') return { type: 'dozen', value: 'third' };
        if (code === 'cl1') return { type: 'column', value: 'first' };
        if (code === 'cl2') return { type: 'column', value: 'second' };
        if (code === 'cl3') return { type: 'column', value: 'third' };
        if (code === 'lo') return { type: 'range', value: 'low' };
        if (code === 'hi') return { type: 'range', value: 'high' };
        if (code === 'ev') return { type: 'parity', value: 'even' };
        if (code === 'od') return { type: 'parity', value: 'odd' };
        if (code === 'rd') return { type: 'color', value: 'red' };
        if (code === 'bk') return { type: 'color', value: 'black' };
        return null;
    }

    function betsFromSpinBody(params) {
        var bets = [];
        for (var key in params) {
            if (!params.hasOwnProperty(key) || NON_BET_FIELDS[key]) continue;
            var amount = Number(params[key]);
            if (!isFinite(amount) || amount <= 0) continue;
            var bet = betFromCode(key);
            if (!bet) return { error: 'Unrecognized bet position: ' + key };
            bets.push({ type: bet.type, value: bet.value, amount: amount });
        }
        return { bets: bets };
    }

    /* ── endpoint handlers ───────────────────────────────────────────────── */

    function handleInit(respond) {
        request('getBalance', {}, ['balanceUpdate'], [], function (msg) {
            if (msg.error) {
                respond(wireError(msg.error));
                return;
            }
            rememberWallet(msg);
            // Table limits: prefer the enforced payoutConfig values (same
            // numbers the server gates every spin with); betLimits is the
            // fallback (it echoes the same config via toPublicGame anyway).
            var limits = lastWallet.betLimits || {};
            var minb = configNumber('tableMin',
                isFinite(Number(limits.effectiveMinBet)) && Number(limits.effectiveMinBet) > 0
                    ? Number(limits.effectiveMinBet) : 1);
            var maxb = configNumber('tableMax',
                isFinite(Number(limits.effectiveMaxBet)) && Number(limits.effectiveMaxBet) > 0
                    ? Number(limits.effectiveMaxBet) : 5000);
            respond('iserr=0&blocknote=&messageids=&jackpot=&availablebalance='
                + '&minb=' + moneyStr(minb) + '&maxb=' + moneyStr(maxb)
                + '&bal=' + moneyStr(lastWallet.balance || 0)
                + buildLimitFields()
                + '&sid=1&tcounter=&lastgameid=0');
            postToParent({ type: 'gameReady', game: GAME_SLUG });
            // Pull the commitment for the FIRST spin (also creates the chain
            // server-side, so the hash exists before any bet can be placed).
            requestFairnessState();
        }, function (msg) {
            respond(wireError(msg && msg.error));
        });
    }

    function handleSpin(body, respond) {
        var translated = betsFromSpinBody(parseBody(body));
        if (translated.error) {
            respond(wireError(translated.error));
            return;
        }
        if (!translated.bets.length) {
            respond(wireError('Place your bets first.'));
            return;
        }
        // Player-side fairness input — echoed back, revealed with the spin.
        request('placeBet', { bets: translated.bets, payload: { clientSeed: clientSeed } }, ['betResult'], ['betError'], function (result) {
            rememberRevealedSpin(result);
            // Every field below is the SERVER's settled outcome, verbatim.
            var outcome = result && result.rouletteOutcome;
            var token = outcome && outcome.number != null ? String(outcome.number) : String(result.result || '');
            if (token === '') {
                respond(wireError('Bet failed. Please try again.'));
                return;
            }
            var balance = Number(result.availableBalance);
            if (!isFinite(balance)) balance = Number(result.availableBalanceAfter);
            if (!isFinite(balance)) balance = lastWallet.balance || 0;
            lastWallet.balance = balance;
            var net = Number(result.netResult);
            if (!isFinite(net)) net = 0;
            var gid = String(result.roundId || '0').replace(/[&=]/g, '');
            respond('iserr=0&blocknote=&messageids=&jackpot=&availablebalance='
                + '&rslt=' + moneyStr(net)
                + '&tcounter=&spin=' + token
                + '&bal=' + moneyStr(balance)
                + '&lastgameid=' + gid);
        }, function (msg) {
            respond(wireError(msg && msg.error));
        });
    }

    // Fold a settled spin's revealed fairness tuple into the panel state (the
    // betResult carries everything the state endpoint would return for it).
    function rememberRevealedSpin(result) {
        var f = result && result.fairness;
        if (!f || !f.serverSeed) return;
        var outcome = (result.rouletteOutcome && typeof result.rouletteOutcome === 'object') ? result.rouletteOutcome : {};
        window.BetterdrFairness.lastRound = {
            roundId: String(result.roundId || ''),
            serverSeed: String(f.serverSeed),
            serverSeedHash: String(f.serverSeedHash || ''),
            clientSeed: String(f.clientSeed || ''),
            nonce: Number(f.nonce) || 0,
            number: outcome.number != null ? String(outcome.number) : String(result.result || ''),
            color: String(outcome.color || ''),
            winningBetKeys: Array.isArray(result.winningBetKeys) ? result.winningBetKeys.map(String) : [],
            totalWager: Number(result.totalWager) || 0,
            totalReturn: Number(result.totalReturn) || 0
        };
        if (window.BetterdrFairness.state && f.serverSeedHashNext) {
            // The next spin's commitment arrived with this result.
            window.BetterdrFairness.state.serverSeedHash = String(f.serverSeedHashNext);
            window.BetterdrFairness.state.nextNonce = (Number(f.nonce) || 0) + 1;
        }
        window.BetterdrFairness.emit();
    }

    function handleHeartbeat(respond) {
        request('getBalance', {}, ['balanceUpdate'], [], function (msg) {
            rememberWallet(msg);
            respond('errorcode=0&errordetails=&GameBalance=' + moneyStr(lastWallet.balance || 0)
                + '&availablebalance=&jackpot=&mysts=&tcounter=&messageids=&blocknote=');
        }, function () {
            respond('errorcode=0&errordetails=&GameBalance=' + moneyStr(lastWallet.balance || 0)
                + '&availablebalance=&jackpot=&mysts=&tcounter=&messageids=&blocknote=');
        });
    }

    /* ── window.Server: the seam rl-game.js talks through ───────────────── */

    window.Server = {
        post: function (url, body, success, error) {
            var route = String(url || '').toLowerCase();
            var respond = function (responseText) {
                try { success(responseText); }
                catch (err) { if (window.console) console.error('[american-roulette bridge]', err); }
            };
            if (route.indexOf('init.aspx') >= 0) { handleInit(respond); return; }
            if (route.indexOf('spin.aspx') >= 0) { handleSpin(body, respond); return; }
            if (route.indexOf('heartbeat.aspx') >= 0) { handleHeartbeat(respond); return; }
            if (error) error('unknown endpoint: ' + url);
        }
    };

    /* ── reveal signal: parent holds balance/result until the wheel stops ── */

    window.SiteBridge = {
        spinComplete: function () {
            postToParent({ type: 'spinComplete', game: GAME_SLUG });
        }
    };
})();
