/*
 * offline-server.js — self-contained offline backend for Video Keno (VkeNO).
 *
 * The original game is a thin client: it POSTs to VideoKeno/Recover.aspx (config
 * + pay table) and VideoKeno/Spin.aspx (draw), and GETs Languages/GetLangXml.aspx.
 * This file hooks jQuery's $.ajax and answers those endpoints locally with a
 * complete keno engine, so the untouched original UI/engine runs offline and can
 * be dropped into any site.  Field names match what web-connector.js parses.
 *
 * The pay table (`Payouts`) is the game's own captured table, so the win math
 * matches the original: pick 1..10 numbers from 1..80, twenty balls are drawn,
 * and the payout is looked up by (spots picked, hits).  Everything is overridable
 * via window.KENO_OFFLINE_CONFIG.
 *
 * Protocol (verified against captured responses):
 *   Recover -> Balance, MinBet, CoinValues, CoinValuesD, MaxSpots, Payouts, …
 *   Spin (CoinValue, CoinsBet, Ticket=n,n,n) -> BallsDrawn (20 nums),
 *        ResultAmt, Balance, GameId
 *   payout entry: "spots,hits,pay;…"   win = pay × CoinValue × CoinsBet
 */
(function () {
    'use strict';

    var CFG = window.KENO_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var PERSIST = CFG.persist !== false;

    var MAX_SPOTS = CFG.maxSpots || 10;
    var MIN_SPOTS = CFG.minSpots || 2;
    var TOTAL_NUMBERS = CFG.totalNumbers || 80;
    var BALLS_DRAWN = CFG.ballsDrawn || 20;
    var MINB = CFG.minBet != null ? CFG.minBet : 0.10;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 5.00;
    var NUM_COINS = CFG.numCoins || 5;
    var CVALS = CFG.coinValues || [0.10, 0.50, 1.00];
    var CVALSD = CFG.coinValuesDisplay || ['10¢', '50¢', '$1'];

    // the game's own pay table: "spots,hits,pay;…"
    var PAYOUTS_STR = CFG.payoutsStr ||
        '10,10,9000.00;10,9,900.00;10,8,90.00;10,7,18.00;10,6,4.00;10,5,3.00;10,4,2.00;10,3,1.00;10,0,2.00;' +
        '9,9,8000.00;9,8,800.00;9,7,80.00;9,6,16.00;9,5,4.00;9,4,2.00;9,3,1.00;9,0,2.00;' +
        '8,8,7000.00;8,7,700.00;8,6,70.00;8,5,7.00;8,4,3.00;8,3,1.00;' +
        '7,7,3000.00;7,6,300.00;7,5,30.00;7,4,3.00;7,3,1.00;' +
        '6,6,800.00;6,5,25.00;6,4,5.00;6,3,2.00;6,2,1.00;' +
        '5,5,400.00;5,4,10.00;5,3,3.00;5,2,1.00;' +
        '4,4,100.00;4,3,4.00;4,2,2.00;3,3,45.00;3,2,2.00;2,2,15.00';

    // parse into PAYTABLE[spots][hits] = pay
    var PAYTABLE = {};
    PAYOUTS_STR.split(';').forEach(function (t) {
        var p = t.split(','); if (p.length < 3) return;
        var spots = parseInt(p[0], 10), hits = parseInt(p[1], 10), pay = parseFloat(p[2]);
        (PAYTABLE[spots] = PAYTABLE[spots] || {})[hits] = pay;
    });

    var BAL_KEY = 'keno_offline_bal', GID_KEY = 'keno_offline_gid';
    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 10267000; g += 1; store(GID_KEY, String(g)); return g; }
    function r2(v) { return Math.round(v * 100) / 100; }

    function parseBody(data) {
        var o = {}; if (!data) return o;
        String(data).split('&').forEach(function (p) { var i = p.indexOf('='); if (i < 0) { o[p] = ''; return; } o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
        return o;
    }
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    // draw N distinct numbers from 1..TOTAL
    function drawBalls() {
        var pool = [];
        for (var i = 1; i <= TOTAL_NUMBERS; i++) pool.push(i);
        for (var j = pool.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = pool[j]; pool[j] = pool[k]; pool[k] = t; }
        return pool.slice(0, BALLS_DRAWN);
    }

    function recoverResponse() {
        return kv({
            iserr: 0, BlockNote: '', MessageIDs: '', GameId: 0, LastGameId: nextGid(),
            Balance: getBal().toFixed(2), AvailableBalance: '', Jackpot: '', TCounter: '', TCounterType: '',
            MinBet: MINB.toFixed(2), MaxBet: MAXB.toFixed(2),
            MaxSpots: MAX_SPOTS, MinSpots: MIN_SPOTS, NumCoins: NUM_COINS,
            CoinValues: CVALS.map(function (v) { return v.toFixed(2); }).join(','),
            CoinValuesD: encodeURIComponent(CVALSD.join(',')),
            CoinValue: CVALS[1] != null ? CVALS[1].toFixed(2) : CVALS[0].toFixed(2),
            ExtraPrice: '1.00', Ball20Mult: 1, Ball01Mult: 1, Ball20Free: 0, ExtraBalls: 0, FreeMult: 1,
            Payouts: PAYOUTS_STR
        });
    }

    function spinResponse(p) {
        var cv = parseFloat(p.CoinValue || p.coinvalue); if (isNaN(cv) || cv <= 0) cv = CVALS[0];
        var coins = parseInt(p.CoinsBet || p.coinsbet, 10); if (isNaN(coins) || coins <= 0) coins = 1;
        var ticket = String(p.Ticket || p.ticket || '').split(',')
            .map(function (s) { return parseInt(s, 10); })
            .filter(function (n) { return !isNaN(n) && n >= 1 && n <= TOTAL_NUMBERS; });
        var spots = ticket.length;

        if (spots < 1 || spots > MAX_SPOTS) {
            return kv({ iserr: 1, BlockNote: encodeURIComponent('Pick 1 to ' + MAX_SPOTS + ' numbers'),
                MessageIDs: '', Balance: getBal().toFixed(2), LastGameId: nextGid() });
        }
        var bet = r2(cv * coins);
        if (bet > getBal() + 1e-9) {
            return kv({ iserr: 1, BlockNote: encodeURIComponent('Insufficient balance'),
                MessageIDs: '', Balance: getBal().toFixed(2), LastGameId: nextGid() });
        }
        setBal(r2(getBal() - bet));

        var balls = drawBalls();
        var drawnSet = {};
        balls.forEach(function (b) { drawnSet[b] = 1; });
        var hits = 0;
        ticket.forEach(function (n) { if (drawnSet[n]) hits++; });

        var pay = (PAYTABLE[spots] && PAYTABLE[spots][hits] != null) ? PAYTABLE[spots][hits] : 0;
        var win = r2(pay * cv * coins);
        setBal(r2(getBal() + win));

        var gid = nextGid();
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv({
            iserr: 0, Jackpot: '', BlockNote: '', MessageIDs: '', AvailableBalance: '', TCounter: '',
            GameId: gid, LastGameId: gid,
            BallsDrawn: balls.join(','),
            ResultAmt: win.toFixed(2),
            Balance: getBal().toFixed(2)
        });
    }

    function heartbeatResponse() {
        return kv({ errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2), availablebalance: '',
            jackpot: '', mysts: '', tcounter: '', messageids: '', blocknote: '' });
    }

    function install($) {
        if (!$ || !$.ajax || $.__kenoOffline) return false;
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
            if (u.indexOf('recover.aspx') >= 0) body = recoverResponse();
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
        $.__kenoOffline = true;
        if (window.console) console.log('%c[offline] video keno backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 100) clearInterval(t); }, 20); }

    window.KenoOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); },
        getBalance: function () { return getBal(); },
        _draw: drawBalls, _paytable: PAYTABLE
    };
})();
