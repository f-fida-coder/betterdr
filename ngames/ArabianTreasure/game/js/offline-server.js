/*
 * offline-server.js — self-contained offline backend for the Arabian Treasure
 * slot (Slots9R9 engine, 5 reels x 3 rows, 30 lines).
 *
 * The original game is a thin client: it POSTs to Slots9R9/Init.aspx and
 * Slots9R9/Spin.aspx, and GETs Languages/GetLangXml.aspx.  This file hooks
 * jQuery's $.ajax and answers those endpoints locally, so the untouched
 * original UI/engine runs offline and can be dropped into any site.
 *
 * The REEL STRIPS are the game's own captured strips (reels look/spin exactly
 * like the original).  The PAYTABLE and PAYLINES live on the vendor's server and
 * were not in the game files, so a clean, standard, fully configurable set is
 * used here (default RTP ~92%) — override window.SLOT_OFFLINE_CONFIG to plug in
 * your own win math.
 *
 * Protocol:
 *   Init -> bal, minb, maxb, cvals, cvalsd, lb, lc, reesa (5 reel strips)
 *   Spin (lb, cv) -> reels=|r1|r2|r3|r4|r5|, cow (coins won), hits, bal, gid
 *   hit entry: <path>.<count><symbol>.<coins>  (path = row 1..3 per matched reel)
 */
(function () {
    'use strict';

    var CFG = window.SLOT_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var PERSIST = CFG.persist !== false;

    // the game's own reel strips (from the captured Init.reesa)
    var REELS = CFG.reels || [
        "HGFBEDCHXGFABEDCHGFAEDHBCGFXEDHCGFABHEDGFCWBAHEDXGFCHEDBAGFCHEDGFBXCAHEDGFCWBHEDAGFCHXBEDGFAHCEDBGFHCAEDGFXHBCWEDGFAHBCEDGFHACED",
        "GFEBHDGFXECHAGFDBEHGFCDEHAXBGFDCHEGFBHDAGFECXHDGFEBAHCWGFDEHGFBXDCAEHGFDHEBCGFADHXEGFBCHDGFEAHGFDCWBEXHGFDAEHCGFBDHEGFACDH",
        "HFDBGHFEXCGDAHBFEGHCDFAGBHEWXFCDGHEFBAHGDCFEHGXBWAFDCHGEFHGBDACEHFGXDBHEWFCGAHFGDEBCHXFGADEHGFCBWHEADGFHCBXGEFDHAGCFBHEWDGFHACEG",
        "HCBFGEDHXCBFAGEDHCBFGHEDACBFXGHWEDCBFAHGEDCBFHGXAEDCBFHGEDWCBFHAGXEDHCBFGAEDHCBFGEDHXCBFGAWHEDGCBFHAEDGCBFXHEDGACBFHWEDGCBFHAEDG",
        "ACEFBDHXACEGFBDHACEGFBDHACEXBGFWDHACEBFADHGCEBXADHFGCEBADHWFCEGBAXDHCEFBGADHCEBFAGDHXCEBWAFDHGBCEAFDHBCEGAXFDHBCEAWGDHBFCEAGDHB"
    ];

    var CVALS = CFG.coinValues || [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];
    var CVALSD = CFG.coinValuesDisplay || ['1¢', '5¢', '10¢', '25¢', '50¢', '$1'];
    var LINES = CFG.lineCount || 30;
    var MINB = CFG.minBet != null ? CFG.minBet : (CVALS[0] * LINES);
    var MAXB = CFG.maxBet != null ? CFG.maxBet : (CVALS[CVALS.length - 1] * LINES);

    var WILD = CFG.wild || 'W';
    var SCATTER = CFG.scatter || 'X';

    // coins paid per line (1 coin/line) for 3/4/5 of a kind — fully overridable
    var PAYTABLE = CFG.paytable || {
        A: { 3: 45, 4: 230, 5: 920 }, B: { 3: 36, 4: 180, 5: 700 },
        C: { 3: 30, 4: 145, 5: 520 }, D: { 3: 26, 4: 125, 5: 420 },
        E: { 3: 21, 4: 100, 5: 340 }, F: { 3: 16, 4: 72, 5: 250 },
        G: { 3: 12, 4: 52, 5: 185 },  H: { 3: 9, 4: 46, 5: 140 }
    };
    // scatter pay (multiplier of TOTAL bet, in coins = mult*lb) by count
    var SCATTER_PAY = CFG.scatterPay || { 3: 2, 4: 10, 5: 50 };

    // 30 standard 5x3 paylines; each is the row (0=top,1=mid,2=bottom) per reel
    var PAYLINES = CFG.paylines || [
        [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
        [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1],
        [1,2,1,0,1],[0,1,1,1,0],[2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],
        [1,1,0,1,1],[1,1,2,1,1],[0,0,1,0,0],[2,2,1,2,2],[0,2,0,2,0],
        [2,0,2,0,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,2,2,2],[2,1,0,0,0],
        [0,0,0,1,2],[2,2,2,1,0],[0,2,2,2,0],[2,0,0,0,2],[1,1,1,0,1]
    ];

    var BAL_KEY = 'slot_al_bal', GID_KEY = 'slot_al_gid';
    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 720100000; g += 1 + Math.floor(Math.random() * 20); store(GID_KEY, String(g)); return g; }
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
            grid.push([strip[s % L], strip[(s + 1) % L], strip[(s + 2) % L]]);
        }
        return grid;
    }

    function evaluate(grid) {
        var hits = [], cow = 0;
        for (var li = 0; li < PAYLINES.length; li++) {
            var line = PAYLINES[li], syms = [];
            for (var r = 0; r < 5; r++) syms.push(grid[r][line[r]]);
            var paySym = null;
            for (var i = 0; i < 5; i++) { if (syms[i] !== WILD && syms[i] !== SCATTER) { paySym = syms[i]; break; } }
            if (paySym == null) paySym = 'A';
            if (!PAYTABLE[paySym]) continue;
            var count = 0;
            for (var j = 0; j < 5; j++) { if (syms[j] === paySym || syms[j] === WILD) count++; else break; }
            if (count >= 3 && PAYTABLE[paySym][count]) {
                var coins = PAYTABLE[paySym][count];
                cow += coins;
                var path = '';
                for (var p = 0; p < count; p++) path += (line[p] + 1);
                hits.push(path + '.' + count + paySym + '.' + coins);
            }
        }
        var sc = 0;
        for (var rr = 0; rr < 5; rr++) for (var cc = 0; cc < 3; cc++) if (grid[rr][cc] === SCATTER) sc++;
        if (sc >= 3 && SCATTER_PAY[sc]) {
            var scCoins = SCATTER_PAY[sc] * LINES;
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
        if (window.console) console.log('%c[offline] arabian treasure slot backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 100) clearInterval(t); }, 20); }

    window.SlotOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); },
        getBalance: function () { return getBal(); },
        _spinGrid: spinGrid, _evaluate: evaluate
    };
})();
