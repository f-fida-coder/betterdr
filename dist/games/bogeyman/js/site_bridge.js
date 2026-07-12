/*
 * Betterdr site bridge for Bogeyman (SL5R-bm 5-reel/25-line HTML5 slot).
 *
 * Replaces the vendor .aspx transport (this build ships NO aspNet backend and
 * NO offline mock). It intercepts the Slots9R9 framework's $.ajax calls —
 * Init.aspx / Spin.aspx / Heartbeat.aspx / GetLangXml.aspx — and translates
 * them to the parent CasinoView postMessage API. The parent holds the JWT and
 * calls the platform API; this iframe never sees a token.
 *
 * SECURITY BOUNDARY: this file contains no RNG, no reel/paytable evaluation
 * and no balance arithmetic. Every reel window, win amount, free-spin count
 * and balance below is copied verbatim from the server's answer into the
 * key=value wire format the vendor client parses (formats captured from the
 * original white-label server). The reel strips / paths / paytable constants
 * embedded here are RENDERING data only (the client builds its reel DOM and
 * paytable labels from them); the server holds its own authoritative copy and
 * settles every spin server-side.
 */
(function () {
    'use strict';

    var GAME_SLUG = 'bogeyman';
    var REQUEST_TIMEOUT_MS = 20000;
    // Served from the site's own origin; never post to or accept from others.
    var PARENT_ORIGIN = window.location.origin;

    /* ── captured display constants (client rendering only) ─────────────── */

    var REESA = 'EGDBHFEGWHFCDEGABHFXEGCDHFWEGBHFAEGDCXHFEGWBHFDEGACHFEGXDBHFCEGWAHFDEGCBHFXEGADHFWEGCBHFEGDXHFAEGCHF,EGDBHFEGXHFCDEGABHFEGCDWHFXEGBHFAEGDCHFEGXBHFDWEGACHFEGDBHFCEGXAHFDEGWCBHFEGADHFXEGCBHFEGDWHFAEGCHF,EGDBHFEGXHFCDEGABHFEGCDWHFXEGBHFAEGDCHFEGXBHFDWEGACHFEGDBHFCEGXAHFDEGWCBHFEGADHFXEGCBHFEGDWHFAEGCHF,EGDBHFEGXHFCDEGABHFEGCDHFEGXBHFAWEGDCHFEGBHFDEGACHFXEGDBHFWCEGAHFDEGCBHFEGXADHFEGCBHFWEGDHFAEGCHF,EGDBHFEGXHFCDEGABHFEGCDHFEGXBHFAEGDCHFEGWBHFDEGACHFXEGDBHFCEGAHFDEGCBHFEGXADHFWEGCBHFEGDHFAEGCHF';
    var PATHS = '22222,11111,33333,12321,32123,11211,33233,21112,23332,11233,33211,21232,23212,12121,32323,12221,32223,21212,23232,22122,22322,13331,31113,13131,31313';
    var PAYT = '2A:10,3A:35,4A:250,5A:1000,3B:30,4B:150,5B:750,3C:25,4C:120,5C:500,3D:20,4D:90,5D:300,3E:10,4E:30,5E:100,3F:10,4F:30,5F:100,3G:10,4G:30,5G:100,3H:10,4H:30,5H:100,2W:15,3W:75,4W:500,5W:3000,3X:FS5,4X:FS10,5X:FS20';
    var CVALS = '0.01%2C0.05%2C0.10%2C0.25%2C0.50%2C1.00%2C2.00';
    var CVALSD = '1%C2%A2%2C5%C2%A2%2C10%C2%A2%2C25%C2%A2%2C50%C2%A2%2C%241%2C%242';
    var ALLSYM = 'FHCGEADBWX';
    var DEFAULT_LINES = 25;
    var DEFAULT_COIN = '0.05';

    // Static pre-spin reel display: first window of each strip (must be a
    // substring of the strip so the client can locate it in its reel DOM).
    var INIT_REELS = (function () {
        var strips = REESA.split(',');
        var out = '|';
        for (var i = 0; i < strips.length; i++) out += strips[i].substring(0, 3) + '|';
        return out;
    })();

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
        try { stored = window.sessionStorage.getItem('bgm_client_seed') || ''; } catch (e) {}
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(stored)) {
            stored = randomClientSeed();
            try { window.sessionStorage.setItem('bgm_client_seed', stored); } catch (e) {}
        }
        return stored;
    }
    var clientSeed = loadClientSeed();

    // window.BetterdrFairness — read/observed by the fairness panel. Holds the
    // current commitment (next-spin serverSeedHash) and the last revealed spin.
    // The strips are published here too: the panel recomputes stops AND windows
    // from them, independently of anything the game rendered.
    window.BetterdrFairness = {
        game: GAME_SLUG,
        clientSeed: clientSeed,
        strips: REESA.split(','),
        paths: PATHS.split(','),
        state: null,       // { serverSeedHash, nextNonce, stripLengths, stripsHash, algorithm }
        lastRound: null,   // { serverSeed, clientSeed, nonce, stripsHash, stops, reels, lineCount, payoutScale, coinsWon, vendorHits, result }
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
            try { window.sessionStorage.setItem('bgm_client_seed', v); } catch (e) {}
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
        return 'bgm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10) + '_' + requestSeq;
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

    // Latest wallet/limits/free-spin state as REPORTED BY THE SERVER (via the
    // parent). Display defaults only — the server re-derives all of it on bet.
    var lastWallet = { balance: null, betLimits: null, gameState: null };

    /* ── admin payout config (server-clamped; display derivation only) ────
     * The parent forwards casinogames.metadata.payoutConfig — already passed
     * through the server's clamp — on every balanceUpdate. The SAME values
     * drive the engine's settlement; everything here only formats them:
     * paytable label = floor(baseCoins x payoutScale), free-spin counts as
     * configured. Identical formula to the server — display == payout. */
    var payoutConfig = { payoutScale: 1, freeSpins3: 5, freeSpins4: 10, freeSpins5: 20 };

    function scaledCoins(baseCoins) {
        return Math.max(0, Math.floor(baseCoins * payoutConfig.payoutScale));
    }

    function normalizePayoutConfig(raw) {
        if (!raw || typeof raw !== 'object') return;
        var scale = Number(raw.payoutScale);
        if (isFinite(scale) && scale > 0) payoutConfig.payoutScale = scale;
        ['freeSpins3', 'freeSpins4', 'freeSpins5'].forEach(function (key) {
            var n = Math.round(Number(raw[key]));
            if (isFinite(n) && n > 0) payoutConfig[key] = n;
        });
        // Read by the pays.html help iframe (same-origin child of this page).
        window.BetterdrPayoutConfig = {
            payoutScale: payoutConfig.payoutScale,
            freeSpins3: payoutConfig.freeSpins3,
            freeSpins4: payoutConfig.freeSpins4,
            freeSpins5: payoutConfig.freeSpins5
        };
        refreshPaytableLabels();
    }

    // Keep the in-game paytable labels (rendered once by processPayoutTable at
    // init) in step if the admin edits config while the game is open.
    function refreshPaytableLabels() {
        try {
            if (!window.jQuery || typeof window.formatWithThousandsPrecisionAndSymbol !== 'function') return;
            var perIcon = buildScaledPayt().split(',');
            for (var i = 0; i < perIcon.length; i++) {
                var kv = perIcon[i].split(':');
                if (kv[1] && kv[1].indexOf('FS') === 0) continue;
                var iconName = kv[0][1];
                window.jQuery('#payout-' + iconName)
                    .attr('data-basePayout', kv[1])
                    .html(window.formatWithThousandsPrecisionAndSymbol(kv[1]));
            }
        } catch (err) { /* label refresh only */ }
    }

    function rememberWallet(msg) {
        if (typeof msg.availableBalance === 'number') lastWallet.balance = msg.availableBalance;
        else if (typeof msg.balance === 'number') lastWallet.balance = msg.balance;
        if (msg.betLimits && typeof msg.betLimits === 'object') lastWallet.betLimits = msg.betLimits;
        if (msg.gameState && typeof msg.gameState === 'object') lastWallet.gameState = msg.gameState;
        if (msg.payoutConfig && typeof msg.payoutConfig === 'object') normalizePayoutConfig(msg.payoutConfig);
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
    // both delimiters from anything free-form (error text).
    function wireSafe(value) {
        return String(value == null ? '' : value).replace(/[&=]/g, ' ');
    }

    function moneyStr(value) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function stateFrees(state) {
        var n = state && Number(state.freeSpinsRemaining);
        return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
    }

    // The paytable string served to the client at init, derived from the base
    // table + the server's clamped payoutConfig (same floor formula the engine
    // pays with; scatter FS counts straight from config).
    function buildScaledPayt() {
        var parts = PAYT.split(',');
        var out = [];
        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split(':');
            if (kv[1].indexOf('FS') === 0) {
                out.push(kv[0] + ':FS' + payoutConfig['freeSpins' + kv[0][0]]);
            } else {
                out.push(kv[0] + ':' + scaledCoins(parseInt(kv[1], 10)));
            }
        }
        return out.join(',');
    }

    function buildInitResponse(balance, betLimits, state) {
        var frees = stateFrees(state);
        var lines = DEFAULT_LINES;
        var coin = DEFAULT_COIN;
        if (frees > 0 && state) {
            // Mid-bonus reload: show the trigger-spin bet the server locked.
            var lockedLines = Number(state.freeSpinLineCount);
            var lockedCoin = Number(state.freeSpinCoinValue);
            if (isFinite(lockedLines) && lockedLines >= 1 && lockedLines <= 25) lines = Math.floor(lockedLines);
            if (isFinite(lockedCoin) && lockedCoin > 0) coin = moneyStr(lockedCoin);
        }
        var minb = betLimits && isFinite(Number(betLimits.effectiveMinBet)) ? Number(betLimits.effectiveMinBet) : 0.01;
        var maxb = betLimits && isFinite(Number(betLimits.effectiveMaxBet)) ? Number(betLimits.effectiveMaxBet) : 50;
        return 'incoins=0&availablebalance=&minb=' + moneyStr(minb) + '&tcounter=&bal=' + moneyStr(balance)
            + '&cvals=' + CVALS + '&gid=0&blocknote=&mysts=&cvalsd=' + CVALSD
            + '&brvars=&reels=' + INIT_REELS + '&afeat=0&messageids=&cuvars=&brpayt='
            + '&maxb=' + moneyStr(maxb) + '&lb=' + lines + '&lc=1'
            + '&reesa=' + REESA + '&tcountertype=&frees=' + frees
            + '&brclid=&jackpot=&fsmult=&iserr=0&maxlc=1&maxlb=25'
            + '&payt=' + buildScaledPayt() + '&paths=' + PATHS
            + '&brplog=&lastgameid=0&brlevs=&minlb=1&brmult=&twks=&cv=' + coin + '&allsym=' + ALLSYM;
    }

    function buildSpinResponse(result) {
        // Every field below is the SERVER's settled outcome, copied verbatim.
        var rd = (result && typeof result.roundData === 'object' && result.roundData) || {};
        var reels = String(rd.vendorReels || '');
        var hits = String(rd.vendorHits || '');
        var cow = Math.max(0, Math.floor(Number(rd.coinsWon) || 0));
        var frees = Math.max(0, Math.floor(Number(rd.freeSpinsAfter) || 0));
        // Prefer availableBalance: the parent refreshes it from the wallet
        // after settle (cent-precise); availableBalanceAfter is the shared
        // response formatter's whole-dollar rounding — fallback only.
        var balance = Number(result.availableBalance);
        if (!isFinite(balance)) balance = Number(result.availableBalanceAfter);
        if (!isFinite(balance)) balance = lastWallet.balance || 0;
        var gid = wireSafe(result.roundId || '0');
        return 'mult=&blocknote=&messageids=&iserr=0&brvars=&reels=' + reels
            + '&brclid=&cow=' + cow + '&tcounter=&gid=' + gid
            + '&frees=' + frees + '&morls=&availablebalance=&afeat=0&fsmult=&cuvars='
            + '&bal=' + moneyStr(balance) + '&reesa=&jackpot=&lastgameid=' + gid
            + '&mysts=&hits=' + hits + '&brpayt=&brmult=';
    }

    function buildSpinError(message) {
        return 'iserr=1&errd=' + wireSafe(message || 'Bet failed. Please try again.');
    }

    function buildHeartbeatResponse(balance) {
        return 'errorcode=0&errordetails=&GameBalance=' + moneyStr(balance)
            + '&availablebalance=&jackpot=&mysts=&tcounter=&messageids=&blocknote=';
    }

    /* ── spinComplete: tell the parent when the reveal is done ───────────── */

    // The parent holds its balance/result banner until the reels have stopped.
    // slots.js calls evaluteHits() exactly once per spin, after the last reel
    // lands — wrap it (lazily; slots.js loads after this file).
    var spinCompleteArmed = false;
    var evaluteHitsWrapped = false;

    function armSpinComplete() {
        spinCompleteArmed = true;
        if (evaluteHitsWrapped || typeof window.evaluteHits !== 'function') return;
        var original = window.evaluteHits;
        window.evaluteHits = function () {
            if (spinCompleteArmed) {
                spinCompleteArmed = false;
                postToParent({ type: 'spinComplete', game: GAME_SLUG });
            }
            return original.apply(this, arguments);
        };
        evaluteHitsWrapped = true;
    }

    /* ── endpoint handlers ───────────────────────────────────────────────── */

    function parseBody(data) {
        var out = {};
        if (!data) return out;
        String(data).split('&').forEach(function (kv) {
            var i = kv.indexOf('=');
            if (i < 0) { out[kv.toLowerCase()] = ''; return; }
            out[decodeURIComponent(kv.slice(0, i)).toLowerCase()] = decodeURIComponent(kv.slice(i + 1));
        });
        return out;
    }

    function handleInit(respond) {
        request('getBalance', {}, ['balanceUpdate'], [], function (msg) {
            if (msg.error) {
                respond('iserr=1&errd=' + wireSafe(msg.error));
                return;
            }
            rememberWallet(msg);
            respond(buildInitResponse(lastWallet.balance || 0, lastWallet.betLimits, lastWallet.gameState));
            postToParent({ type: 'gameReady', game: GAME_SLUG });
            // Pull the commitment for the FIRST spin (also creates the chain
            // server-side, so the hash exists before any bet can be placed).
            requestFairnessState();
        }, function (msg) {
            respond('iserr=1&errd=' + wireSafe(msg && msg.error));
        });
    }

    function handleSpin(params, respond) {
        var lines = parseInt(params.lb, 10);
        if (!isFinite(lines)) lines = DEFAULT_LINES;
        var coinValue = Number(params.cv);
        if (!isFinite(coinValue)) coinValue = Number(DEFAULT_COIN);
        var bets = {
            lines: lines,
            coinValue: coinValue,
            totalBet: Math.round(lines * coinValue * 100) / 100
        };
        var payload = {
            clientFs: String(params.fs || '0'),
            lastGameId: String(params.lastgameid || ''),
            // Player-side fairness input — echoed back, revealed with the spin.
            clientSeed: clientSeed
        };
        request('placeBet', { bets: bets, payload: payload }, ['betResult'], ['betError'], function (msg) {
            armSpinComplete();
            rememberRevealedSpin(msg);
            respond(buildSpinResponse(msg));
        }, function (msg) {
            respond(buildSpinError(msg && msg.error));
        });
    }

    // Fold a settled spin's revealed fairness tuple into the panel state (the
    // betResult carries everything the state endpoint would return for it).
    function rememberRevealedSpin(result) {
        var f = result && result.fairness;
        if (!f || !f.serverSeed) return;
        var rd = (result.roundData && typeof result.roundData === 'object') ? result.roundData : {};
        var pa = (result.payoutApplied && typeof result.payoutApplied === 'object') ? result.payoutApplied : {};
        window.BetterdrFairness.lastRound = {
            roundId: String(result.roundId || ''),
            serverSeed: String(f.serverSeed),
            serverSeedHash: String(f.serverSeedHash || ''),
            clientSeed: String(f.clientSeed || ''),
            nonce: Number(f.nonce) || 0,
            stripsHash: String(f.stripsHash || ''),
            stops: rd.stops || [],
            reels: rd.reels || [],
            lineCount: Number(rd.lineCount) || 25,
            payoutScale: Number(pa.payoutScale) || 1,
            coinsWon: Number(rd.coinsWon) || 0,
            vendorHits: String(rd.vendorHits || ''),
            result: String(result.result || '')
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
            respond(buildHeartbeatResponse(lastWallet.balance || 0));
        }, function () {
            respond(buildHeartbeatResponse(lastWallet.balance || 0));
        });
    }

    /* ── $.ajax interception (same seam the vendor framework rides) ─────── */

    function install($) {
        var realAjax = $.ajax;
        $.ajax = function (a, b) {
            var opts = (typeof a === 'object') ? a : (b || {});
            if (typeof a === 'string') opts.url = a;
            var url = String(opts.url || '').toLowerCase();

            // Captured language XML is a static asset now — rewrite and let the
            // real $.ajax fetch it (dataType:"xml" parsing intact).
            if (url.indexOf('getlangxml.aspx') >= 0) {
                var langOpts = $.extend({}, opts, { url: 'lang/en.xml?v=20260712a' });
                return realAjax.call(this, langOpts);
            }

            var route = null;
            if (url.indexOf('init.aspx') >= 0) route = 'init';
            else if (url.indexOf('spin.aspx') >= 0) route = 'spin';
            else if (url.indexOf('heartbeat.aspx') >= 0) route = 'heartbeat';
            else if (url.indexOf('enter.aspx') >= 0 || url.indexOf('game.aspx') >= 0) route = 'enter';
            if (route === null) return realAjax.apply(this, arguments);

            var dfd = $.Deferred();
            var respond = function (responseText) {
                try {
                    if (opts.success) opts.success.call(opts, responseText, 'success', { responseText: responseText });
                } catch (err) {
                    if (window.console) console.error('[bogeyman bridge]', err);
                }
                if (opts.complete) { try { opts.complete({ responseText: responseText }, 'success'); } catch (e) {} }
                dfd.resolve(responseText, 'success', { responseText: responseText });
            };

            if (route === 'init') handleInit(respond);
            else if (route === 'spin') handleSpin(parseBody(opts.data), respond);
            else if (route === 'heartbeat') handleHeartbeat(respond);
            else respond('GAMESESSION=platform&errcode=0');

            return dfd.promise();
        };
    }

    if (window.jQuery) {
        install(window.jQuery);
    } else {
        var tries = 0;
        var poll = setInterval(function () {
            if (window.jQuery) { clearInterval(poll); install(window.jQuery); }
            else if (++tries > 200) clearInterval(poll);
        }, 10);
    }
})();
