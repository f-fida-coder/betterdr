/*
 * Betterdr site bridge for Aces & Eights (VP_Classic_D video poker, VPA8).
 *
 * Replaces the vendor .aspx transport (this build ships NO aspNet backend and
 * NO offline mock). It intercepts the VP_Classic framework's $.ajax calls —
 * GetGameData.aspx / Deal.aspx / Hit.aspx / Heartbeat.aspx / GetLangXml — and
 * translates them to the parent CasinoView postMessage API. The parent holds
 * the JWT and calls the platform API; this iframe never sees a token.
 *
 * SECURITY BOUNDARY: this file contains no RNG, no card selection, no hand
 * evaluation and no balance arithmetic. Every card, result code, win amount
 * and balance below is copied verbatim from the server's answer into the
 * key=value wire format the vendor client parses (formats captured from the
 * original white-label server). Even the paytable labels are SERVER-FED at
 * init — if the server sends no paytable the game fails loud rather than
 * display numbers the engine didn't settle with.
 *
 * TWO-STAGE ROUND: video poker is one logical round in two calls.
 *   Deal.aspx  -> placeBet { action:'deal', coinValue, coinsBet }
 *                 server debits the full wager, deals 5 cards, keeps the
 *                 round open (roundStatus 'dealt').
 *   Hit.aspx   -> placeBet { action:'draw', roundId, holds[5] }
 *                 server draws replacements from ITS OWN committed deck
 *                 order, evaluates, credits, settles.
 * The vendor wire flag Rn='Y' means REPLACE card n; we translate to
 * holds[n] = (Rn !== 'Y') so the server-side contract speaks in holds.
 * A 'dealt' round left open (reload/disconnect) is restored by GetGameData
 * via OPENGAMESCOUNT=1 + the dealt cards — the engine natively resumes into
 * its draw phase. The stake stays debited; only the draw settles it.
 */
(function () {
    'use strict';

    var GAME_SLUG = 'aces-and-eights';
    var REQUEST_TIMEOUT_MS = 20000;
    // Served from the site's own origin; never post to or accept from others.
    var PARENT_ORIGIN = window.location.origin;

    // Vendor paytable row keys, in the engine's parse order. Values come from
    // the server at init (gameState.gameConfig.paytable) — never hardcoded.
    var HAND_KEYS = ['JB', '_2P', '_3K', 'ST', 'FL', 'FH', '_4K', '_47', 'SF', 'A8', 'NR'];

    /* ── provably-fair client state ──────────────────────────────────────── */

    // Fresh, unpredictable client seed generated in-browser (32 hex chars of
    // CSPRNG), persisted per tab session so a player keeps a stable seed across
    // hands and editable from the fairness panel. Never a server-supplied
    // constant; cleared → regenerate randomly. Revealed with each settled hand,
    // so it is not a secret — it just lets the player contribute entropy.
    function randomClientSeed() {
        var bytes = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        var hex = '';
        for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
        return hex;
    }
    function loadClientSeed() {
        var stored = '';
        try { stored = window.sessionStorage.getItem('vpa8_client_seed') || ''; } catch (e) {}
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(stored)) {
            stored = randomClientSeed();
            try { window.sessionStorage.setItem('vpa8_client_seed', stored); } catch (e) {}
        }
        return stored;
    }
    var clientSeed = loadClientSeed();

    // window.BetterdrFairness — read/observed by the fairness panel. Holds the
    // next-round commitment and the last revealed round. Card codes 1..52.
    window.BetterdrFairness = {
        game: GAME_SLUG,
        clientSeed: clientSeed,
        shoeSize: 52,
        state: null,       // { serverSeedHash, nextNonce, algorithm }
        lastRound: null,   // { serverSeed, clientSeed, nonce, holds, dealt, final, finalHandCode, ... }
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
            try { window.sessionStorage.setItem('vpa8_client_seed', v); } catch (e) {}
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

    /* ── parent messaging ────────────────────────────────────────────────── */

    var pendingRequests = {};
    var requestSeq = 0;

    function createRequestId() {
        requestSeq += 1;
        return 'vpa8_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10) + '_' + requestSeq;
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

    // Latest wallet/limits/game state as REPORTED BY THE SERVER (via the
    // parent). Display defaults only — the server re-derives all of it on bet.
    var lastWallet = { balance: null, betLimits: null, gameState: null };
    // The open round's server roundId. The engine echoes its GameId back on
    // Hit; we keep our own copy too so a mangled echo can't target another
    // round (the server enforces owner + status anyway).
    var openRoundId = null;

    function rememberWallet(msg) {
        if (typeof msg.availableBalance === 'number') lastWallet.balance = msg.availableBalance;
        else if (typeof msg.balance === 'number') lastWallet.balance = msg.balance;
        if (msg.betLimits && typeof msg.betLimits === 'object') lastWallet.betLimits = msg.betLimits;
        if (msg.gameState && typeof msg.gameState === 'object') lastWallet.gameState = msg.gameState;
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

    /* ── wire-format helpers (captured vendor grammar) ───────────────────── */

    // Values ride a naive split('&')/split('=') parser on the client — strip
    // both delimiters from anything free-form (error text, ids).
    function wireSafe(value) {
        return String(value == null ? '' : value).replace(/[&=]/g, ' ');
    }

    function moneyStr(value) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function kv(obj) {
        var parts = [];
        for (var k in obj) { if (obj.hasOwnProperty(k)) parts.push(k + '=' + obj[k]); }
        return parts.join('&');
    }

    function parseBody(data) {
        var out = {};
        if (!data) return out;
        String(data).split('&').forEach(function (p) {
            var i = p.indexOf('=');
            if (i < 0) { out[p.toLowerCase()] = ''; return; }
            out[decodeURIComponent(p.slice(0, i)).toLowerCase()] = decodeURIComponent(p.slice(i + 1));
        });
        return out;
    }

    function errorResponse(message) {
        return kv({
            blocknote: encodeURIComponent(String(message || 'Request failed. Please try again.')),
            iserr: 1,
            ingame: 0,
            newbalance: moneyStr(lastWallet.balance || 0),
            messageids: ''
        });
    }

    // Card fields: server sends the engine's own 1..52 codes; copy verbatim.
    function putCards(target, cards, holds) {
        for (var i = 0; i < 5; i++) {
            target['c' + (i + 1)] = cards && cards[i] != null ? cards[i] : '';
            target['h' + (i + 1)] = holds && holds[i] ? 'Y' : 'N';
        }
        target.c6 = ''; target.c7 = ''; target.h6 = 'N'; target.h7 = 'N';
        return target;
    }

    function resolveBalance(result) {
        // Prefer availableBalance: the parent refreshes it from the wallet
        // after every call (cent-precise); the shared response formatter's
        // availableBalanceAfter is whole-dollar rounded — fallback only.
        var balance = Number(result && result.availableBalance);
        if (!isFinite(balance)) balance = Number(result && result.availableBalanceAfter);
        if (!isFinite(balance)) balance = lastWallet.balance || 0;
        return balance;
    }

    /* ── GetGameData: paytable + limits + open-round restore ─────────────── */

    function buildGameDataResponse() {
        var state = lastWallet.gameState || {};
        var cfg = (state.gameConfig && typeof state.gameConfig === 'object') ? state.gameConfig : {};
        var paytable = (cfg.paytable && typeof cfg.paytable === 'object') ? cfg.paytable : null;
        var coinValues = Array.isArray(cfg.coinValues) ? cfg.coinValues : null;
        if (!paytable || !coinValues) {
            // No server paytable => nothing trustworthy to display. Fail loud.
            return errorResponse('Game configuration unavailable. Please reload.');
        }

        var o = {};
        for (var h = 0; h < HAND_KEYS.length; h++) {
            var key = HAND_KEYS[h];
            var row = paytable[key];
            for (var c = 1; c <= 5; c++) {
                o[key + '_' + c] = (row && row[c - 1] != null) ? row[c - 1] : 0;
            }
        }

        var limits = lastWallet.betLimits || {};
        var minb = isFinite(Number(limits.effectiveMinBet)) ? Number(limits.effectiveMinBet) : Number(cfg.minBet) || 0.25;
        var maxb = isFinite(Number(limits.effectiveMaxBet)) ? Number(limits.effectiveMaxBet) : Number(cfg.maxBet) || 25;

        o.blocknote = ''; o.iserr = 0; o.maxbet = moneyStr(maxb);
        o.messageids = ''; o.minbet = moneyStr(minb);
        o.newbalance = moneyStr(lastWallet.balance || 0); o.tcounter = '';
        o.allowedcoinvalues = coinValues.map(function (v) { return moneyStr(v); }).join(',');
        o.allowedcoinvaluesd = (Array.isArray(cfg.coinValuesDisplay) ? cfg.coinValuesDisplay : coinValues.map(function (v) {
            return v < 1 ? (Math.round(v * 100) + '¢') : ('$' + Math.round(v));
        })).join(',');
        o.jackpot = ''; o.sessionid = 1; o.tcountertype = ''; o.availablebalance = '';

        var open = (state.openRound && typeof state.openRound === 'object') ? state.openRound : null;
        if (open && Array.isArray(open.dealt) && open.dealt.length === 5) {
            // Mid-hand restore: the engine reads OPENGAMESCOUNT + cards and
            // resumes straight into its draw phase. Only the 5 DEALT cards
            // ever reach the client — the server never sends undealt cards.
            openRoundId = String(open.roundId || '');
            o.opengamescount = 1;
            o.gameid = wireSafe(openRoundId);
            o.coinsbet = Math.max(1, Math.min(5, Number(open.coinsBet) || 1));
            o.coinvalue = moneyStr(open.coinValue);
            putCards(o, open.dealt, null);
        } else {
            openRoundId = null;
            o.opengamescount = 0;
            o.gameid = 0;
            o.coinvalue = moneyStr(cfg.defaultCoinValue != null ? cfg.defaultCoinValue : coinValues[0]);
        }

        return kv(o);
    }

    function handleGameData(respond) {
        request('getBalance', {}, ['balanceUpdate'], [], function (msg) {
            if (msg.error) {
                respond(errorResponse(msg.error));
                return;
            }
            rememberWallet(msg);
            respond(buildGameDataResponse());
            postToParent({ type: 'gameReady', game: GAME_SLUG });
            // Pull the commitment for the FIRST deal (also CREATES the seed
            // chain server-side, so the hash exists before any bet — the deal
            // loud-fails 409 without it).
            requestFairnessState();
        }, function (msg) {
            respond(errorResponse(msg && msg.error));
        });
    }

    /* ── Deal: stage 1 of the round (server debits + deals) ─────────────── */

    function buildDealResponse(result) {
        var rd = (result && typeof result.roundData === 'object' && result.roundData) || {};
        var o = {
            jackpot: '', blocknote: '', availablebalance: '',
            gameid: wireSafe(result.roundId || '0'),
            newbalance: moneyStr(resolveBalance(result)),
            // Initial-hand hint code (JB/2P/…/'-'), from the server evaluator.
            result: wireSafe(rd.dealtHandCode || '-'),
            ingame: 1, iserr: 0, tcounter: '', messageids: '',
            lastgameid: wireSafe(result.roundId || '0')
        };
        putCards(o, rd.dealt, null);
        return kv(o);
    }

    function handleDeal(params, respond) {
        var coinValue = Number(params.coinvalue);
        var coinsBet = parseInt(params.coinsbet, 10);
        var bets = {
            action: 'deal',
            coinValue: isFinite(coinValue) ? coinValue : 0,
            coinsBet: isFinite(coinsBet) ? coinsBet : 1
        };
        // Player-side fairness input for the seeded shuffle — echoed back and
        // revealed only when the hand settles at draw.
        request('placeBet', { bets: bets, payload: { clientSeed: clientSeed } }, ['betResult'], ['betError'], function (msg) {
            openRoundId = String(msg.roundId || '');
            // Update the panel's commitment for the now-open round (no seed yet).
            rememberOpenCommitment(msg);
            respond(buildDealResponse(msg));
        }, function (msg) {
            respond(errorResponse(msg && msg.error));
        });
    }

    // The deal response carries the commitment (serverSeedHash) + next
    // commitment for the OPEN round — but NOT the serverSeed (deferred reveal).
    function rememberOpenCommitment(result) {
        var f = result && result.fairness;
        if (!f) return;
        if (window.BetterdrFairness.state) {
            window.BetterdrFairness.state.serverSeedHash = String(f.serverSeedHash || window.BetterdrFairness.state.serverSeedHash || '');
            if (f.serverSeedHashNext) window.BetterdrFairness.state.serverSeedHashNext = String(f.serverSeedHashNext);
        }
        window.BetterdrFairness.emit();
    }

    /* ── Hit: stage 2 (server draws from ITS committed order + settles) ──── */

    function buildDrawResponse(result) {
        var rd = (result && typeof result.roundData === 'object' && result.roundData) || {};
        var o = {
            blocknote: '',
            resultamt: moneyStr(result.totalReturn),
            dbup: 'N', // double-up is not offered on this platform
            jackpot: '', availablebalance: '',
            newbalance: moneyStr(resolveBalance(result)),
            result: wireSafe(rd.finalHandCode || '-'),
            ingame: 1, iserr: 0, tcounter: '', messageids: '',
            lastgameid: wireSafe(result.roundId || '0')
        };
        putCards(o, rd.final, null);
        return kv(o);
    }

    function handleHit(params, respond) {
        // Vendor wire: Rn='Y' means REPLACE card n. Server contract: holds.
        var holds = [];
        for (var i = 1; i <= 5; i++) {
            holds.push(String(params['r' + i] || 'N').toUpperCase() !== 'Y');
        }
        var roundId = String(params.gameid || openRoundId || '');
        var bets = { action: 'draw', roundId: roundId, holds: holds };
        request('placeBet', { bets: bets, payload: {} }, ['betResult'], ['betError'], function (msg) {
            openRoundId = null;
            // Draw settles the round → the serverSeed is NOW revealed. Fold the
            // revealed tuple + holds into the panel so the player can verify.
            rememberRevealedRound(msg, holds);
            respond(buildDrawResponse(msg));
        }, function (msg) {
            respond(errorResponse(msg && msg.error));
        });
    }

    // Fold a settled hand's revealed fairness tuple into the panel state.
    function rememberRevealedRound(result, holds) {
        var f = result && result.fairness;
        if (!f || !f.serverSeed) return;
        var rd = (result.roundData && typeof result.roundData === 'object') ? result.roundData : {};
        window.BetterdrFairness.lastRound = {
            roundId: String(result.roundId || ''),
            serverSeed: String(f.serverSeed),
            serverSeedHash: String(f.serverSeedHash || ''),
            clientSeed: String(f.clientSeed || ''),
            nonce: Number(f.nonce) || 0,
            shoeSize: Number(f.shoeSize) || 52,
            deckHash: String(f.deckHash || ''),
            holds: (rd.holds || holds || []).map(function (h) { return !!h; }),
            dealt: (rd.dealt || []).map(Number),
            final: (rd.final || []).map(Number),
            finalHandCode: String(rd.finalHandCode || ''),
            finalHandName: String(rd.finalHandName || ''),
            result: String(result.result || '')
        };
        if (window.BetterdrFairness.state && f.serverSeedHashNext) {
            // The next round's commitment arrived with this result.
            window.BetterdrFairness.state.serverSeedHash = String(f.serverSeedHashNext);
            window.BetterdrFairness.state.nextNonce = (Number(f.nonce) || 0) + 1;
        }
        window.BetterdrFairness.emit();
    }

    /* ── Heartbeat ───────────────────────────────────────────────────────── */

    function buildHeartbeatResponse(balance) {
        return kv({
            errorcode: 0, errordetails: '', GameBalance: moneyStr(balance),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '',
            messageids: '', blocknote: ''
        });
    }

    function handleHeartbeat(respond) {
        request('getBalance', {}, ['balanceUpdate'], [], function (msg) {
            rememberWallet(msg);
            respond(buildHeartbeatResponse(lastWallet.balance || 0));
        }, function () {
            respond(buildHeartbeatResponse(lastWallet.balance || 0));
        });
    }

    // Benign no-op for every other vendor .aspx (messages, collect, double,
    // bonus, …). Carries iserr=0 + empty message fields + the current balance,
    // so the message poller sees "no messages", collect sees the (already
    // credited) balance, and nothing errors or blocks. No feature we offer
    // depends on these endpoints doing anything.
    function buildNoopResponse() {
        return kv({
            iserr: 0, errorcode: 0, blocknote: '', messageids: '', mysts: '',
            errordetails: '', jackpot: '', tcounter: '', availablebalance: '',
            dbup: 'N', newbalance: moneyStr(lastWallet.balance || 0),
            GameBalance: moneyStr(lastWallet.balance || 0)
        });
    }

    /* ── $.ajax interception (same seam the vendor framework rides) ─────── */

    function install($) {
        if (!$ || !$.ajax || $.__betterdrBridge) return false;
        var realAjax = $.ajax;
        $.ajax = function (a, b) {
            var opts = (typeof a === 'object') ? a : (b || {});
            if (typeof a === 'string') opts.url = a;
            var url = String(opts.url || '').toLowerCase();

            // Captured language XML is a static asset now — rewrite and let
            // the real $.ajax fetch it (dataType:"xml" parsing intact).
            if (url.indexOf('getlangxml') >= 0) {
                var langOpts = $.extend({}, opts, { url: '../GetLangXml.xml?v=20260713a' });
                return realAjax.call(this, langOpts);
            }

            var route = null;
            if (url.indexOf('getgamedata.aspx') >= 0) route = 'gamedata';
            else if (url.indexOf('deal.aspx') >= 0) route = 'deal';
            else if (url.indexOf('hit.aspx') >= 0) route = 'hit';
            else if (url.indexOf('heartbeat.aspx') >= 0) route = 'heartbeat';
            // Every OTHER vendor .aspx the engine calls (Messages/Get, Collect,
            // Double, DoubleUp, BonusRound, BonusPlayerLog, Enter, Chiptransfer,
            // …) has NO backend here. Left to fall through, it 404s — and some
            // of these (the message poller especially) treat a non-answer as an
            // error and pop a blocking "null" message that locks the game after
            // a round. So we ANSWER them all with a benign no-op success; the
            // engine reads the fields it needs (none present → safe defaults)
            // and carries on. Real non-.aspx asset requests still pass through.
            else if (url.indexOf('.aspx') >= 0) route = 'noop';
            if (route === null) return realAjax.apply(this, arguments);

            var dfd = $.Deferred();
            var respond = function (responseText) {
                try {
                    if (opts.success) opts.success.call(opts, responseText, 'success', { responseText: responseText });
                } catch (err) {
                    if (window.console) console.error('[aces-and-eights bridge]', err);
                }
                if (opts.complete) { try { opts.complete({ responseText: responseText }, 'success'); } catch (e) {} }
                dfd.resolve(responseText, 'success', { responseText: responseText });
            };

            if (route === 'gamedata') handleGameData(respond);
            else if (route === 'deal') handleDeal(parseBody(opts.data), respond);
            else if (route === 'hit') handleHit(parseBody(opts.data), respond);
            else if (route === 'heartbeat') handleHeartbeat(respond);
            else respond(buildNoopResponse()); // any other vendor .aspx

            return dfd.promise();
        };
        $.__betterdrBridge = true;
        return true;
    }

    if (!install(window.jQuery)) {
        var tries = 0;
        var poll = setInterval(function () {
            if (install(window.jQuery) || ++tries > 200) clearInterval(poll);
        }, 10);
    }

    /* ── engine auto-init (works around a broken URL-launch path) ──────────
     * The VP_Classic engine boots from URL params on $(document).ready, but
     * its getUrlVars() UPPERCASES every key while the init reads lowercase
     * (arrayIn.gamesession / .gamecode / .currency) — so GlobalGameSession is
     * always undefined and afterEnter() (which fires GetGameData → our bridge
     * → balance/paytable) never runs, leaving the board blank with NaN money.
     * We can't patch the minified engine, so once it's loaded we call
     * afterEnter() ourselves with params parsed case-insensitively from our
     * own launch URL. The session string is opaque (auth lives with the
     * parent); the engine only needs it non-empty to proceed. Fires exactly
     * once. */
    function launchParam(name) {
        var q = window.location.search.slice(1).split('&');
        for (var i = 0; i < q.length; i++) {
            var eq = q[i].indexOf('=');
            if (eq < 0) continue;
            if (decodeURIComponent(q[i].slice(0, eq)).toLowerCase() === name) {
                return decodeURIComponent(q[i].slice(eq + 1));
            }
        }
        return '';
    }

    var autoInitDone = false;
    function autoInit() {
        if (autoInitDone) return true;
        if (typeof window.afterEnter !== 'function' || !window.jQuery) return false;
        // Let the engine's own $(document).ready init settle first (it builds
        // the loading section + wires translation targets); calling afterEnter
        // mid-setup races its translation pass (null parentNode). Gate on a
        // fully-parsed document before we kick it.
        if (document.readyState !== 'complete') return false;
        autoInitDone = true;
        // The engine's post-translation pass throws a benign null-parentNode
        // (an ml-key label target absent in this integration) and surfaces it
        // as an alert() — cosmetic only; money path, paytable and play are
        // unaffected. Swallow JUST that one init alert (matched by text) for a
        // few seconds so the player never sees the popup; every other alert
        // (e.g. a real deal/draw error) still shows, and normal alerts resume
        // after the init window.
        var realAlert = window.alert;
        window.alert = function (msg) {
            if (String(msg == null ? '' : msg).indexOf('getTranslations') >= 0) {
                if (window.console) console.warn('[aces-and-eights bridge] suppressed benign init translation alert');
                return;
            }
            return realAlert.apply(window, arguments);
        };
        setTimeout(function () { window.alert = realAlert; }, 8000);
        // Currency drives the engine's money formatting (it reads the global
        // `currency`); the URL path would set it from arrayIn.currency.
        var cur = launchParam('currency');
        if (cur) { try { window.currency = cur; } catch (e) {} }
        var session = launchParam('gamesession') || 'platform|VPA8|1|1|PLATFORM|en';
        var gamecode = launchParam('gamecode') || 'VPA8';
        var showChips = launchParam('showchips');
        var showCashier = launchParam('showcashier') || '0';
        var showHistory = launchParam('showhistory') || '0';
        var showType = launchParam('showtype') || '1';
        try {
            window.afterEnter(session, gamecode, showChips, showCashier, showHistory, showType);
        } catch (e) {
            if (window.console) console.error('[aces-and-eights bridge] auto-init failed', e);
        }
        return true;
    }
    // Poll until the engine has defined afterEnter AND the document is fully
    // parsed (its own document.ready ran + failed the URL path), then, after a
    // short settle so the engine's loading/translation setup completes, kick
    // it once. Give it a generous window.
    function scheduleAutoInit() {
        var initTries = 0;
        var initPoll = setInterval(function () {
            if (autoInitDone) { clearInterval(initPoll); return; }
            if (typeof window.afterEnter === 'function' && window.jQuery && document.readyState === 'complete') {
                clearInterval(initPoll);
                setTimeout(autoInit, 400); // settle past the engine's own init pass
            } else if (++initTries > 800) {
                clearInterval(initPoll);
            }
        }, 25);
    }
    scheduleAutoInit();
})();
