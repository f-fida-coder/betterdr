/*
 * offline-server.js — self-contained offline backend for the Serpent's Treasure
 * slot (Slots9R9 engine, 5 reels x 3 rows, 9 lines).
 *
 * The original game is a thin client: it POSTs to Slots9R9/Init.aspx and
 * Slots9R9/Spin.aspx, and GETs Languages/GetLangXml.aspx.  This file hooks
 * jQuery's $.ajax and answers those endpoints locally, so the untouched
 * original UI/engine runs offline and can be dropped into any site.
 *
 * This game's captured Init included the *exact* paytable (`payt`) and paylines
 * (`paths`), so line/scatter win math matches the original.  A/B/C/D and the
 * wild pay on 2-of-a-kind; E-H pay on 3+.  The `Z` bonus-round symbol is not
 * triggered in the offline build (no bonus data was captured); everything is
 * overridable via window.SLOT_OFFLINE_CONFIG.
 *
 * Protocol:
 *   Init -> bal, minb, maxb, cvals, cvalsd, lb, lc, reesa, paths, payt
 *   Spin (lb, cv) -> reels=|r1|r2|r3|r4|r5| (each 3 symbols), cow, hits, bal, gid
 *   hit entry: <path>.<count><symbol>.<coins>  (path = row 1..3 per matched reel)
 */
(function () {
    'use strict';

    var CFG = window.SLOT_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var PERSIST = CFG.persist !== false;
    var ROWS = 3;

    // the game's own reel strips (captured Init.reesa)
    var REELS = CFG.reels || [
        "EDGWCHFXGEDHBCGDFBEWGFCHDFGACHDFBECHAGDFEHBCGFDHBGCFAHEDGCAHEBGFDCHEGXDHCFEXFHDCGHBEFXGDCHEFBGXEHDCFEAGHBEGFDHXEGCWHAFGBEHADGBFW",
        "EDGZCHFXGEDHZCGDFBEZGFCHAFGZCHDFBEAHZGAFEBZCGWDHBGWFZAEDGCAHEBZFDCHWGXDHCFEXZHDCGHBEFXZDCHEWBGXZHDCFEAGHBEZFDHXEGCZHAFGBEHZDGBFZ",
        "EDGZCHFXGEDHZCGDFBEZGFCHAFGZCHDFBEAHZGAFEBZCGWDHBGWFZAEDGCAHEBZWFDCWGXDHCFEXZHDCGHBEFXZDCHEFBGXZHDCFEAGHBEZFDHXEGCZHAFGBEHZDGBFZ",
        "EDGZCHFXGEDHZCGDFBEZGFCHAFGZCHDFBEAHZGAFEBZCGADWBGWFZHEDGCAHEBWZFDHWGXDHCFEXZHDCGHBEFXZDCHEFBGXZHDCFEAGHBEZFDHXEGCZHAFGBEHZDGBFZ",
        "EDGHCXFHGEDHACGDFHEBGFCHAFGWCHDFGEBHWGAFEHBCGFDHEGCFBHEDGCAHEBGFDCHEGXDHCFEXFHDCGHBEFXGDCHEFBGXEHDCFEAGHBEGFDHXEGCWHAFGBEHBDGBFA"
    ];

    var CVALS = CFG.coinValues || [0.05, 0.10, 0.25, 0.50];
    var CVALSD = CFG.coinValuesDisplay || ['5¢', '10¢', '25¢', '50¢'];
    var LINES = CFG.lineCount || 9;
    var MINB = CFG.minBet != null ? CFG.minBet : 0.05;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 4.50;
    var WILD = CFG.wild || 'W';
    var SCATTER = CFG.scatter || 'X';

    // the game's own paytable and paylines, as captured in Init.
    var PAYT_STR = CFG.paytStr ||
        '2A:5,3A:50,4A:500,5A:2500,2B:3,3B:30,4B:150,5B:500,2C:2,3C:20,4C:100,5C:400,' +
        '2D:2,3D:20,4D:75,5D:300,3E:10,4E:50,5E:200,3F:10,4F:50,5F:200,3G:5,4G:25,5G:150,' +
        '3H:5,4H:25,5H:100,2W:50,3W:500,4W:5000,5W:10000,3Z:BR3,3X:5,4X:25,5X:100';
    var PATHS_STR = CFG.pathsStr || '22222,11111,33333,12321,32123,11211,33233,21112,23332';

    // parse the paytable: line coins per symbol/count, plus scatter multipliers
    var PAYTABLE = {}, SCATTER_PAY = {};
    PAYT_STR.split(',').forEach(function (t) {
        var m = t.match(/^(\d)([A-Z]):(.+)$/); if (!m) return;
        var count = parseInt(m[1], 10), sym = m[2], val = m[3];
        if (sym === SCATTER) { if (/^\d+$/.test(val)) SCATTER_PAY[count] = parseInt(val, 10); }
        else if (/^\d+$/.test(val)) { (PAYTABLE[sym] = PAYTABLE[sym] || {})[count] = parseInt(val, 10); }
        // non-numeric (e.g. 3Z:BR3) = bonus feature, not triggered offline
    });
    if (CFG.paytable) PAYTABLE = CFG.paytable;
    if (CFG.scatterPay) SCATTER_PAY = CFG.scatterPay;

    // paylines: each path digit 1..3 -> row 0..2
    var PAYLINES = CFG.paylines || PATHS_STR.split(',').map(function (p) {
        return p.split('').map(function (d) { return parseInt(d, 10) - 1; });
    });

    var BAL_KEY = 'slot_st_bal', GID_KEY = 'slot_st_gid';
    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 910100000; g += 1 + Math.floor(Math.random() * 20); store(GID_KEY, String(g)); return g; }
    function r2(v) { return Math.round(v * 100) / 100; }

    function parseBody(data) {
        var o = {}; if (!data) return o;
        String(data).split('&').forEach(function (p) { var i = p.indexOf('='); if (i < 0) { o[p] = ''; return; } o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
        return o;
    }
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    function spinGrid() {
        var grid = [];
        for (var r = 0; r < 5; r++) {
            var strip = REELS[r], L = strip.length;
            var s = Math.floor(Math.random() * L);
            var col = [];
            for (var row = 0; row < ROWS; row++) col.push(strip[(s + row) % L]);
            grid.push(col);
        }
        return grid;
    }

    function evaluate(grid) {
        var hits = [], cow = 0;
        for (var li = 0; li < PAYLINES.length; li++) {
            var line = PAYLINES[li], syms = [];
            for (var r = 0; r < 5; r++) syms.push(grid[r][line[r]]);

            var wildRun = 0;
            while (wildRun < 5 && syms[wildRun] === WILD) wildRun++;
            var sym = null;
            for (var i = 0; i < 5; i++) { if (syms[i] !== WILD && syms[i] !== SCATTER) { sym = syms[i]; break; } }
            var symRun = 0;
            if (sym) { while (symRun < 5 && (syms[symRun] === sym || syms[symRun] === WILD)) symRun++; }

            var wCoins = (PAYTABLE[WILD] && PAYTABLE[WILD][wildRun]) ? PAYTABLE[WILD][wildRun] : 0;
            var sCoins = (sym && PAYTABLE[sym] && PAYTABLE[sym][symRun]) ? PAYTABLE[sym][symRun] : 0;

            var coins, count, winSym;
            if (wCoins >= sCoins && wCoins > 0) { coins = wCoins; count = wildRun; winSym = WILD; }
            else if (sCoins > 0) { coins = sCoins; count = symRun; winSym = sym; }
            else continue;

            cow += coins;
            var path = '';
            for (var p = 0; p < count; p++) path += (line[p] + 1);
            hits.push(path + '.' + count + winSym + '.' + coins);
        }

        // scatter anywhere -> coins (multiplier of total bet)
        var sc = 0;
        for (var rr = 0; rr < 5; rr++) for (var cc = 0; cc < ROWS; cc++) if (grid[rr][cc] === SCATTER) sc++;
        if (sc >= 3 && SCATTER_PAY[Math.min(sc, 5)]) {
            var scCoins = SCATTER_PAY[Math.min(sc, 5)] * LINES;
            cow += scCoins;
            var spath = '';
            for (var q = 0; q < Math.min(sc, 5); q++) spath += '1';
            hits.push(spath + '.' + Math.min(sc, 5) + SCATTER + '.' + scCoins);
        }
        return { hits: hits, cow: cow };
    }

    function initResponse() {
        return kv({
            iserr: 0, errcode: '', errd: '',
            incoins: 0, availablebalance: '', minb: MINB.toFixed(2), tcounter: '',
            bal: getBal().toFixed(2),
            cvals: encodeURIComponent(CVALS.map(function (v) { return v.toFixed(2); }).join(',')),
            gid: '', blocknote: '', mysts: '',
            cvalsd: encodeURIComponent(CVALSD.join(',')),
            brvars: '', afeat: 0, messageids: '', cuvars: '', brpayt: '',
            maxb: MAXB.toFixed(2), lb: LINES, lc: 1,
            payt: PAYT_STR,
            paths: PATHS_STR,
            reesa: REELS.join(',')
        });
    }

    function spinResponse(p) {
        var cv = parseFloat(p.cv); if (isNaN(cv) || cv <= 0) cv = CVALS[0];
        var lb = parseInt(p.lb, 10); if (isNaN(lb) || lb <= 0) lb = LINES;
        var bet = r2(lb * cv);
        if (bet > getBal() + 1e-9) {
            return kv({ iserr: 1, errd: encodeURIComponent('Insufficient balance'), blocknote: '',
                messageids: '', bal: getBal().toFixed(2), lastgameid: nextGid() });
        }
        setBal(r2(getBal() - bet));
        var grid = spinGrid();
        var ev = evaluate(grid);
        setBal(r2(getBal() + ev.cow * cv));
        var reelsStr = '|' + grid.map(function (col) { return col.join(''); }).join('|') + '|';
        var gid = nextGid();
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv({
            mult: '', blocknote: '', messageids: '', iserr: 0, brvars: '',
            reels: reelsStr, brclid: '', cow: ev.cow, tcounter: '', gid: gid,
            frees: 0, morls: '', availablebalance: '', afeat: 0, fsmult: '', cuvars: '',
            bal: getBal().toFixed(2), reesa: '', jackpot: '', lastgameid: gid,
            mysts: '', hits: ev.hits.join(','), brpayt: '', brmult: ''
        });
    }

    function heartbeatResponse() {
        return kv({ errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2), availablebalance: '',
            jackpot: '', mysts: '', tcounter: '', messageids: '', blocknote: '' });
    }

    function install($) {
        if (!$ || !$.ajax || $.__slotOffline) return false;
        var realAjax = $.ajax;
        function fakeJqXHR() { var a = { readyState: 4, status: 200 }; a.done = a.fail = a.always = a.then = function () { return a; }; return a; }
        $.ajax = function (url, options) {
            if (typeof url === 'object') { options = url; url = options.url; }
            options = options || {};
            var u = String(url || options.url || '').toLowerCase();
            if (u.indexOf('getlangxml') >= 0) {
                var opts = {}; for (var kk in options) opts[kk] = options[kk];
                opts.url = CFG.langUrl || 'GetLangXml.xml';
                return realAjax.call($, opts);
            }
            var body = null;
            if (u.indexOf('init.aspx') >= 0) body = initResponse();
            else if (u.indexOf('spin.aspx') >= 0) body = spinResponse(parseBody(options.data));
            else if (u.indexOf('heartbeat.aspx') >= 0) body = heartbeatResponse();
            if (body !== null) {
                setTimeout(function () {
                    try { if (typeof options.success === 'function') options.success.call(options, body); }
                    catch (e) { if (window.console) console.error('[offline] handler error', e); }
                }, 45);
                return fakeJqXHR();
            }
            return realAjax.apply($, arguments);
        };
        $.__slotOffline = true;
        if (window.console) console.log('%c[offline] serpents treasure slot backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 100) clearInterval(t); }, 20); }

    window.SlotOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); },
        getBalance: function () { return getBal(); },
        _spinGrid: spinGrid, _evaluate: evaluate, _paytable: PAYTABLE, _paylines: PAYLINES, _scatter: SCATTER_PAY
    };
})();
