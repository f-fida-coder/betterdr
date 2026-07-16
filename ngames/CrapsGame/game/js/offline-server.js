/*
 * offline-server.js — self-contained offline backend for the Craps game.
 *
 * The original game is a thin client: it POSTs the full bet layout to
 * Craps/Recover.aspx (state restore) and craps/roll.aspx (each roll), and
 * GETs Languages/GetLangXml.aspx (translations).  This file hooks jQuery's
 * $.ajax and answers those endpoints locally with a complete craps engine,
 * so the untouched original UI/engine runs with no network and can be dropped
 * into any site.  Response field names match exactly what web-connector.js
 * and ms-server-connector.js parse.
 *
 * Money model (verified against captured server responses):
 *   bal  = full bankroll, including chips currently on the table
 *   totb = total wagered still working on the table
 *   A roll changes bal by +profit on winning bets and -stake on losing bets;
 *   pushes, travels and no-decision bets leave bal unchanged.  The client
 *   shows available cash as (bal - working bets), so stakes are reserved but
 *   never double-counted.
 *
 * Config below (start balance, limits, chips) can be overridden per-embed via
 * window.CRAPS_OFFLINE_CONFIG before this script runs.
 */
(function () {
    'use strict';

    var CFG = window.CRAPS_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var MINB = CFG.minBet != null ? CFG.minBet : 1.00;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 100.00;
    var PERSIST = CFG.persist !== false;         // remember balance between sessions

    var BAL_KEY = 'cp_offline_bal', PT_KEY = 'cp_offline_point', GID_KEY = 'cp_offline_gid';

    // ---- persistent state ------------------------------------------------
    var mem = {};
    function store(k, v) {
        if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} }
        mem[k] = v;
    }
    function load(k) {
        if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} }
        return k in mem ? mem[k] : null;
    }

    function getBal() {
        var b = parseFloat(load(BAL_KEY));
        if (isNaN(b)) { b = START_BALANCE; setBal(b); }
        return b;
    }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function getPoint() { var p = parseInt(load(PT_KEY), 10); return isNaN(p) ? -1 : p; }
    function setPoint(p) { store(PT_KEY, String(p)); }
    function nextGid() {
        var g = parseInt(load(GID_KEY), 10);
        if (isNaN(g)) g = 22390000;
        g += 1; store(GID_KEY, String(g)); return g;
    }

    function r2(v) { return Math.round(v * 100) / 100; }

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
    function kv(obj) {
        var parts = [], k;
        for (k in obj) if (obj.hasOwnProperty(k)) parts.push(k + '=' + obj[k]);
        return parts.join('&');
    }

    // ---- odds tables -----------------------------------------------------
    var TRUE_ODDS  = { 4: 2, 10: 2, 5: 3 / 2, 9: 3 / 2, 6: 6 / 5, 8: 6 / 5 };
    var LAY_ODDS   = { 4: 1 / 2, 10: 1 / 2, 5: 2 / 3, 9: 2 / 3, 6: 5 / 6, 8: 5 / 6 };
    var PLACE_ODDS = { 4: 9 / 5, 10: 9 / 5, 5: 7 / 5, 9: 7 / 5, 6: 7 / 6, 8: 7 / 6 };
    var HARD_ODDS  = { 4: 7, 10: 7, 6: 9, 8: 9 };
    var HORN_ODDS  = { 2: 30, 3: 15, 11: 15, 12: 30 };
    var POINT_NUMS = { 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1 };

    function suffixNum(code, prefix) {
        if (code.slice(0, prefix.length) !== prefix) return null;   // prefix must match
        var rest = code.slice(prefix.length);
        if (!/^\d+$/.test(rest)) return null;                       // remainder must be a number
        return parseInt(rest, 10);
    }

    // Resolve one working bet against a roll.
    // Returns { resolved, res, travelTo } :
    //   resolved=true  -> bet comes down; emit res<code>=res (net profit; -stake on loss; 0 push)
    //   resolved=false -> bet stays; emit bet<code>=amt
    //   travelTo set    -> original bet moved to a new working code (resolved, no res emitted)
    function settle(code, amt, d1, d2, point) {
        var t = d1 + d2, hard = d1 === d2, n;
        var win  = function (mult) { return { resolved: true, res: r2(amt * mult) }; };
        var lose = function () { return { resolved: true, res: -amt }; };
        var push = function () { return { resolved: true, res: 0 }; };
        var keep = function () { return { resolved: false }; };
        var move = function (c) { return { resolved: true, travelTo: c }; };
        var comingOut = point < 0;

        // pass line / pass odds
        if (code === 'pa') {
            if (comingOut) {
                if (t === 7 || t === 11) return win(1);
                if (t === 2 || t === 3 || t === 12) return lose();
                return keep();
            }
            if (t === point) return win(1);
            if (t === 7) return lose();
            return keep();
        }
        if (code === 'opa') {
            if (comingOut) return keep();
            if (t === point) return win(TRUE_ODDS[point] || 1);
            if (t === 7) return lose();
            return keep();
        }
        // don't pass / don't pass odds
        if (code === 'dp') {
            if (comingOut) {
                if (t === 2 || t === 3) return win(1);
                if (t === 12) return push();
                if (t === 7 || t === 11) return lose();
                return keep();
            }
            if (t === 7) return win(1);
            if (t === point) return lose();
            return keep();
        }
        if (code === 'odp') {
            if (comingOut) return keep();
            if (t === 7) return win(LAY_ODDS[point] || 1);
            if (t === point) return lose();
            return keep();
        }
        // come / don't come (travel to their number)
        if (code === 'cm') {
            if (t === 7 || t === 11) return win(1);
            if (t === 2 || t === 3 || t === 12) return lose();
            return move('co' + t);
        }
        if (code === 'dc') {
            if (t === 2 || t === 3) return win(1);
            if (t === 12) return push();
            if (t === 7 || t === 11) return lose();
            return move('do' + t);
        }
        // come-point flat + odds
        if ((n = suffixNum(code, 'co')) != null) {
            if (t === n) return win(1);
            if (t === 7) return lose();
            return keep();
        }
        if ((n = suffixNum(code, 'oco')) != null) {
            if (t === n) return win(TRUE_ODDS[n] || 1);
            if (t === 7) return lose();
            return keep();
        }
        // don't-come flat + odds/lay
        if ((n = suffixNum(code, 'odo')) != null) {
            if (t === 7) return win(LAY_ODDS[n] || 1);
            if (t === n) return lose();
            return keep();
        }
        if ((n = suffixNum(code, 'do')) != null) {
            if (t === 7) return win(1);
            if (t === n) return lose();
            return keep();
        }
        if ((n = suffixNum(code, 'ly')) != null) {
            if (t === 7) return win(LAY_ODDS[n] || 1);
            if (t === n) return lose();
            return keep();
        }
        // place / place-to-win / buy — off on the come-out roll
        if ((n = suffixNum(code, 'pl')) != null) {
            if (comingOut) return keep();
            if (t === n) return win(PLACE_ODDS[n] || 1);
            if (t === 7) return lose();
            return keep();
        }
        if ((n = suffixNum(code, 'pw')) != null) {
            if (comingOut) return keep();
            if (t === n) return win(PLACE_ODDS[n] || 1);
            if (t === 7) return lose();
            return keep();
        }
        if ((n = suffixNum(code, 'by')) != null) {
            if (comingOut) return keep();
            if (t === n) return win(TRUE_ODDS[n] || 1);
            if (t === 7) return lose();
            return keep();
        }
        // big 6 / big 8 (always working)
        if (code === 'bg6') { if (t === 6) return win(1); if (t === 7) return lose(); return keep(); }
        if (code === 'bg8') { if (t === 8) return win(1); if (t === 7) return lose(); return keep(); }
        // hardways — off on come-out
        if ((n = suffixNum(code, 'hd')) != null) {
            if (comingOut) return keep();
            if (t === n) return hard ? win(HARD_ODDS[n] || 7) : lose();
            if (t === 7) return lose();
            return keep();
        }
        // single-roll bets
        if (code === 'fd') {
            if (t === 2) return win(2);
            if (t === 12) return win(3);
            if (t === 3 || t === 4 || t === 9 || t === 10 || t === 11) return win(1);
            return lose();
        }
        if ((n = suffixNum(code, 'hn')) != null) {
            return (t === n) ? win(HORN_ODDS[n] || 15) : lose();
        }
        if (code === 'sv') { return (t === 7) ? win(4) : lose(); }        // any seven
        if (code === 'ac') { return (t === 2 || t === 3 || t === 12) ? win(7) : lose(); }

        return lose();   // unknown code: consume stake (should not happen)
    }

    var BET_RE = /^(opa|pa|odp|dp|cm|dc|fd|bg6|bg8|sv|ac|oco\d+|co\d+|odo\d+|do\d+|ly\d+|pl\d+|pw\d+|by\d+|hd\d+|hn\d+)$/;
    var GROUP = function (c) {
        var m = c.match(/^([a-z]+)/); return m ? m[1] : c;
    };
    var MAXPOS = { pa: 100, opa: 100, dp: 100, odp: 100, cm: 100, dc: 100, fd: 100,
                   bg: 100, co: 100, oco: 100, do: 100, odo: 100, ly: 100,
                   pl: 100, pw: 100, by: 100, hd: 50, hn: 25, sv: 25, ac: 25 };

    // ---- endpoint handlers ----------------------------------------------
    function recoverResponse() {
        // fresh offline session: no recovered bets on the table
        setPoint(-1);
        return kv({
            blocknote: '', iserr: 0, isrec: 0, sid: 1, messageids: '',
            availablebalance: '', jackpot: '', tcounter: '', tcountertype: '',
            oth_betsoff: 2, oth_dontbar: 12,
            cupo: -1, totb: '0.00',
            maxb: MAXB.toFixed(2), minb: MINB.toFixed(2),
            bal: getBal().toFixed(2),
            lastgameid: nextGid()
        });
    }

    function heartbeatResponse() {
        return kv({
            errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '',
            messageids: '', blocknote: ''
        });
    }

    function errResponse(msg) {
        return kv({
            blocknote: '', iserr: 1, errd: encodeURIComponent(msg), messageids: '',
            cupo: getPoint(), totb: '0.00', bal: getBal().toFixed(2), lastgameid: nextGid()
        });
    }

    function rollResponse(params) {
        var point = getPoint();
        var k;

        // the client posts the full working layout each roll; collect it
        var working = {}, layoutTotal = 0;
        for (k in params) {
            if (!params.hasOwnProperty(k) || !BET_RE.test(k)) continue;
            var amt = parseFloat(params[k]);
            if (isNaN(amt) || amt <= 0) continue;
            var cap = MAXPOS[GROUP(k)] || MAXB;
            if (amt > cap) return errResponse('Maximum on this spot is $' + cap.toFixed(2));
            working[k] = r2(amt);
            layoutTotal += amt;
        }
        layoutTotal = r2(layoutTotal);
        if (layoutTotal <= 0) return errResponse('Place your bets first');
        // can't have more on the table than the bankroll holds
        if (layoutTotal > getBal() + 1e-9) return errResponse('Insufficient balance');

        // roll two dice (window.__CRAPS_FORCE_DICE lets tests/hosts inject rolls)
        var d1, d2;
        var forced = window.__CRAPS_FORCE_DICE;
        if (forced && forced.length >= 2) { d1 = forced.shift(); d2 = forced.shift(); }
        else { d1 = 1 + Math.floor(Math.random() * 6); d2 = 1 + Math.floor(Math.random() * 6); }
        var t = d1 + d2;

        // settle every working bet
        var results = {}, nextWorking = {}, balDelta = 0;
        for (k in working) {
            if (!working.hasOwnProperty(k)) continue;
            var s = settle(k, working[k], d1, d2, point);
            if (s.travelTo) {
                nextWorking[s.travelTo] = r2((nextWorking[s.travelTo] || 0) + working[k]);
            } else if (s.resolved) {
                results['res' + k] = s.res;
                balDelta += s.res;
            } else {
                nextWorking[k] = r2((nextWorking[k] || 0) + working[k]);
            }
        }
        setBal(r2(getBal() + balDelta));

        // advance the point
        if (point < 0) { if (POINT_NUMS[t]) point = t; }
        else if (t === point || t === 7) { point = -1; }
        setPoint(point);

        var totb = 0;
        for (k in nextWorking) if (nextWorking.hasOwnProperty(k)) totb += nextWorking[k];

        var out = {};
        for (k in nextWorking) if (nextWorking.hasOwnProperty(k)) out['bet' + k] = nextWorking[k];
        for (k in results) if (results.hasOwnProperty(k)) out[k] = results[k];
        out.blocknote = ''; out.iserr = 0; out.messageids = '';
        out.availablebalance = ''; out.jackpot = ''; out.tcounter = '';
        out.d1 = d1; out.d2 = d2;
        out.cupo = point;
        out.totb = r2(totb).toFixed(2);
        out.bal = getBal().toFixed(2);
        out.lastgameid = nextGid();

        // the roll parser does not read BAL, so publish it straight to the
        // in-page game state that the UI reads when it repaints.
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv(out);
    }

    // ---- jQuery $.ajax hook ---------------------------------------------
    function install($) {
        if (!$ || !$.ajax || $.__crapsOffline) return false;
        var realAjax = $.ajax;

        function fakeJqXHR() {
            var api = { readyState: 4, status: 200 };
            api.done = function () { return api; };
            api.fail = function () { return api; };
            api.always = function () { return api; };
            api.then = function () { return api; };
            return api;
        }

        $.ajax = function (url, options) {
            if (typeof url === 'object') { options = url; url = options.url; }
            options = options || {};
            var u = String(url || options.url || '').toLowerCase();

            // language file: serve the captured static XML (it sits next to the
            // game page) instead of hitting the .aspx endpoint.
            if (u.indexOf('getlangxml') >= 0) {
                var opts = {};
                for (var kk in options) opts[kk] = options[kk];
                opts.url = CFG.langUrl || 'GetLangXml.xml';
                return realAjax.call($, opts);
            }

            var body = null;
            if (u.indexOf('recover.aspx') >= 0) body = recoverResponse();
            else if (u.indexOf('roll.aspx') >= 0) body = rollResponse(parseBody(options.data));
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
        $.__crapsOffline = true;
        if (window.console) console.log('%c[offline] craps backend active', 'color:#28a745');
        return true;
    }

    // jQuery is loaded right before this script; install now, and guard with a
    // short poll in case of load-order surprises when embedded elsewhere.
    if (!install(window.jQuery)) {
        var tries = 0;
        var t = setInterval(function () {
            if (install(window.jQuery) || ++tries > 100) clearInterval(t);
        }, 20);
    }

    // expose a reset so hosts can zero the demo wallet
    window.CrapsOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); setPoint(-1); },
        getBalance: function () { return getBal(); }
    };
})();
