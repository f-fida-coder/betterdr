/*
 * mock-server.js — Offline server emulator for American Roulette (rl)
 *
 * The original game is a thin client: Init.aspx returns balance/limits,
 * Spin.aspx receives the bets as form fields (su8=1.00&dz3=5.00...) and
 * returns  spin=<number>&rslt=<net>&bal=<balance>.  This file answers those
 * endpoints locally with a self-contained roulette engine so the game runs
 * fully offline.  Response field format reverse-engineered from the captured
 * server responses and rl/js/web-connector.js parsers:
 *
 *   Init: max_cn=100&max_ff=125&max_hs=50&max_st=75&max_su=25&max_sx=150&
 *         max_vs=50&max_xs=50&max_xt=75&...&maxb=100.00&sid=1&minb=1.00&
 *         bal=1831.20&lastgameid=34682117
 *   Spin: ...&rslt=-1.00&...&spin=22&bal=1830.20&lastgameid=34682120
 *
 * Bet field codes (client & server agree, modelled on the captured su/dz/cl
 * fields): su<t> straight ('t' may be 0, 00 or 1..36), sp<a>_<b> split,
 * st<c> street (c=1..12), tz basket 0-00-2, cn<n> corner (n = lowest number),
 * sx<c> six line (streets c and c+1), ff five bet (0,00,1,2,3),
 * dz1..dz3 dozens, cl1..cl3 columns, lo/hi/ev/od/rd/bk even-money bets.
 */
(function () {
    'use strict';

    var START_BALANCE = 2000.00;
    var BAL_KEY = 'rl_offline_balance';
    var GID_KEY = 'rl_offline_gameid';

    var MINB = 1.00, MAXB = 100.00;

    // per-position maximums, mirroring the captured Init limits
    var MAXPOS = { su: 25, sp: 50, st: 75, tz: 75, cn: 100, ff: 125, sx: 150,
                   dz: 100, cl: 100, lo: 100, hi: 100, ev: 100, od: 100, rd: 100, bk: 100 };

    var RED = { 1:1, 3:1, 5:1, 7:1, 9:1, 12:1, 14:1, 16:1, 18:1, 19:1, 21:1,
                23:1, 25:1, 27:1, 30:1, 32:1, 34:1, 36:1 };

    function getBal() {
        var b = parseFloat(localStorage.getItem(BAL_KEY));
        if (isNaN(b)) { b = START_BALANCE; setBal(b); }
        return b;
    }
    function setBal(b) { localStorage.setItem(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }

    function nextGameId() {
        var g = parseInt(localStorage.getItem(GID_KEY), 10);
        if (isNaN(g)) g = 34600000;
        g += 1 + Math.floor(Math.random() * 3);
        localStorage.setItem(GID_KEY, String(g));
        return g;
    }

    function parseBody(data) {
        var o = {};
        if (!data) return o;
        String(data).split('&').forEach(function (p) {
            var i = p.indexOf('=');
            if (i < 0) { o[p] = ''; return; }
            o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1));
        });
        return o;
    }

    // ---- bet resolution -------------------------------------------------
    // token: '0', '00' or '1'..'36'  ->  hit test against winning token
    function streetNums(c) { return [3 * c - 2, 3 * c - 1, 3 * c]; }

    // returns array of covered tokens (strings), or null if code is invalid
    function coveredNumbers(code) {
        var m, nums;
        if ((m = code.match(/^su(00|\d{1,2})$/))) {
            return [m[1]];
        }
        if ((m = code.match(/^sp(00|\d{1,2})_(00|\d{1,2})$/))) {
            return [m[1], m[2]];
        }
        if ((m = code.match(/^st(\d{1,2})$/))) {
            var c = parseInt(m[1], 10);
            if (c < 1 || c > 12) return null;
            return streetNums(c).map(String);
        }
        if (code === 'tz') return ['0', '00', '2'];
        if ((m = code.match(/^cn(\d{1,2})$/))) {
            var n = parseInt(m[1], 10);           // lowest number of the corner
            if (n < 1 || n > 32 || n % 3 === 0) return null;
            return [n, n + 1, n + 3, n + 4].map(String);
        }
        if ((m = code.match(/^sx(\d{1,2})$/))) {
            var s = parseInt(m[1], 10);
            if (s < 1 || s > 11) return null;
            return streetNums(s).concat(streetNums(s + 1)).map(String);
        }
        if (code === 'ff') return ['0', '00', '1', '2', '3'];
        return null;   // outside bets handled separately
    }

    // payout multiplier (profit per 1 staked) for an inside bet with n numbers
    var INSIDE_PAY = { 1: 35, 2: 17, 3: 11, 4: 8, 5: 6, 6: 5 };

    function betWins(code, amount, winTok) {
        var winN = (winTok === '0' || winTok === '00') ? -1 : parseInt(winTok, 10);

        // outside bets: zeros always lose
        switch (code) {
            case 'dz1': return (winN >= 1  && winN <= 12) ? amount * 2 : 0;
            case 'dz2': return (winN >= 13 && winN <= 24) ? amount * 2 : 0;
            case 'dz3': return (winN >= 25 && winN <= 36) ? amount * 2 : 0;
            case 'cl1': return (winN >= 1 && winN % 3 === 1) ? amount * 2 : 0;
            case 'cl2': return (winN >= 1 && winN % 3 === 2) ? amount * 2 : 0;
            case 'cl3': return (winN >= 1 && winN % 3 === 0) ? amount * 2 : 0;
            case 'lo':  return (winN >= 1  && winN <= 18) ? amount : 0;
            case 'hi':  return (winN >= 19 && winN <= 36) ? amount : 0;
            case 'ev':  return (winN >= 1 && winN % 2 === 0) ? amount : 0;
            case 'od':  return (winN >= 1 && winN % 2 === 1) ? amount : 0;
            case 'rd':  return (winN >= 1 && RED[winN])  ? amount : 0;
            case 'bk':  return (winN >= 1 && !RED[winN]) ? amount : 0;
        }

        var nums = coveredNumbers(code);
        if (!nums) return 0;
        if (nums.indexOf(winTok) < 0) return 0;
        var mult = INSIDE_PAY[nums.length];
        return mult ? amount * mult : 0;
    }

    // ---- responses ------------------------------------------------------
    function kv(obj) {
        var parts = [], k;
        for (k in obj) if (obj.hasOwnProperty(k)) parts.push(k + '=' + obj[k]);
        return parts.join('&');
    }

    function initResponse() {
        return kv({
            max_cn: MAXPOS.cn, max_ff: MAXPOS.ff, max_hs: MAXPOS.sp,
            max_st: MAXPOS.st, max_su: MAXPOS.su, max_sx: MAXPOS.sx,
            max_vs: MAXPOS.sp, max_xs: MAXPOS.lo, max_xt: MAXPOS.dz,
            tcountertype: '', blocknote: '', iserr: 0, messageids: '',
            jackpot: '', availablebalance: '',
            maxb: MAXB.toFixed(2), sid: 1, tcounter: '',
            minb: MINB.toFixed(2),
            bal: getBal().toFixed(2),
            lastgameid: nextGameId()
        });
    }

    function heartbeatResponse() {
        return kv({
            errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '',
            messageids: '', blocknote: ''
        });
    }

    var SKIP = { GameSession: 1, iseuro: 1, lastgameid: 1, rand: 1 };

    function spinResponse(params) {
        // collect bets
        var bets = [], total = 0, k;
        for (k in params) {
            if (!params.hasOwnProperty(k) || SKIP[k]) continue;
            var amt = parseFloat(params[k]);
            if (isNaN(amt) || amt <= 0) continue;
            bets.push({ code: k, amount: amt });
            total += amt;
        }
        total = Math.round(total * 100) / 100;

        if (total < MINB) {
            return kv({ blocknote: '', iserr: 1, errd: encodeURIComponent('Minimum bet is $' + MINB.toFixed(2)),
                        messageids: '', bal: getBal().toFixed(2), lastgameid: nextGameId() });
        }
        if (total > getBal()) {
            return kv({ blocknote: '', iserr: 1, errd: encodeURIComponent('Insufficient balance'),
                        messageids: '', bal: getBal().toFixed(2), lastgameid: nextGameId() });
        }

        // spin the wheel: 38 pockets
        var POCKETS = ['0', '00'];
        for (var n = 1; n <= 36; n++) POCKETS.push(String(n));
        var winTok = POCKETS[Math.floor(Math.random() * POCKETS.length)];

        // settle
        var returned = 0;                 // stake back + profit on winning bets
        bets.forEach(function (b) {
            var profit = betWins(b.code, b.amount, winTok);
            if (profit > 0) returned += b.amount + profit;
        });
        returned = Math.round(returned * 100) / 100;
        var rslt = Math.round((returned - total) * 100) / 100;   // net result

        setBal(getBal() - total + returned);

        return kv({
            blocknote: '', iserr: 0, messageids: '', jackpot: '',
            availablebalance: '',
            rslt: rslt.toFixed(2),
            tcounter: '',
            spin: winTok,
            bal: getBal().toFixed(2),
            lastgameid: nextGameId()
        });
    }

    // ---- router ----------------------------------------------------------
    // Server.post(url, body, success)  — async, mirrors the $.ajax POST the
    // original web-connector.js performs against the .aspx endpoints.
    function handle(url, body) {
        var u = String(url).toLowerCase();
        var p = parseBody(body);
        if (u.indexOf('init.aspx') >= 0)      return initResponse();
        if (u.indexOf('spin.aspx') >= 0)      return spinResponse(p);
        if (u.indexOf('heartbeat.aspx') >= 0) return heartbeatResponse();
        return null;
    }

    window.Server = {
        post: function (url, body, success, error) {
            var resp = null;
            try { resp = handle(url, body); }
            catch (e) { if (window.console) console.error('mock-server error', e); }
            setTimeout(function () {
                if (resp === null) { if (error) error('unknown endpoint: ' + url); return; }
                success(resp);
            }, 60);
        }
    };

    if (window.console) console.log('%c[offline] mock roulette server active', 'color:#28a745');
})();
