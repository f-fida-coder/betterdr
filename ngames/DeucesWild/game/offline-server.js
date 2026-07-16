/*
 * offline-server.js — self-contained offline backend for Deuces Wild video poker
 * (VP_Classic_D engine, VPDW).
 *
 * Hooks jQuery's $.ajax and answers VideoPoker/GetGameData.aspx, Deal.aspx and
 * Hit.aspx (plus GetLangXml / heartbeat) locally, so the untouched original
 * UI/engine runs offline and can be dropped into any site.  The pay table is the
 * game's own captured table, so the win math matches the original.  Overridable
 * via window.VP_OFFLINE_CONFIG.
 *
 * Deuces Wild: all four 2s are fully wild.  Minimum paying hand is three of a
 * kind; special hands are Four Deuces, Wild Royal Flush and Five of a Kind.
 *
 * Cards: 1..52 (suit = floor((n-1)/13), rank = (n-1)%13, 0=Ace..12=King);
 * a deuce is any card whose rank value is 2.
 *   GetGameData -> <hand>_<coins> pay grid + config
 *   Deal (coinValue, coinsBet) -> c1..c5, result, gameid
 *   Hit (GameId, R1..R5 = Y replace / N hold) -> new c1..c5, result, resultamt
 *   win = pay[result][coinsBet] × coinValue
 */
(function () {
    'use strict';

    var CFG = window.VP_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var PERSIST = CFG.persist !== false;

    var MINB = CFG.minBet != null ? CFG.minBet : 0.25;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 25.00;
    var CVALS = CFG.allowedCoinValues || [0.25, 0.50, 1.00, 2.00, 5.00];
    var CVALSD = CFG.allowedCoinValuesDisplay || ['25¢', '50¢', '$1', '$2', '$5'];

    // the game's own pay table: hand -> [pay@1coin .. @5]
    var PAYTABLE = CFG.paytable || {
        _3K: [1, 2, 3, 4, 5],
        ST:  [2, 4, 6, 8, 10],
        FL:  [2, 4, 6, 8, 10],
        FH:  [3, 6, 9, 12, 15],
        _4K: [4, 8, 12, 16, 20],
        SF:  [13, 26, 39, 52, 65],
        _5K: [16, 32, 48, 64, 80],
        DR:  [25, 50, 75, 100, 125],   // wild (deuces) royal
        NR:  [125, 250, 375, 500, 2000],
        _4D: [200, 400, 600, 800, 1000] // four deuces
    };
    var HAND_ORDER = ['_3K', 'FL', 'ST', 'FH', '_4K', 'SF', '_5K', 'DR', 'NR', '_4D'];

    var BAL_KEY = 'vp_dw_bal', GID_KEY = 'vp_dw_gid', RND_KEY = 'vp_dw_round';
    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 47100000; g += 1; store(GID_KEY, String(g)); return g; }
    function r2(v) { return Math.round(v * 100) / 100; }

    function parseBody(data) {
        var o = {}; if (!data) return o;
        String(data).split('&').forEach(function (p) { var i = p.indexOf('='); if (i < 0) { o[p] = ''; return; } o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
        return o;
    }
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    function card(n) { var idx = (n - 1) % 13; return { rank: idx === 0 ? 14 : idx + 1, suit: Math.floor((n - 1) / 13) }; }

    // natural 5-card category (cards is an array of {rank,suit}; may contain
    // duplicate ranks from wild substitution). returns {cat, royal}.
    // cat: 9=5oak 8=SF/royal 7=4oak 6=FH 5=FL 4=ST 3=3oak 2=2pair 1=pair 0=high
    function natEval(cs) {
        var suits = cs.map(function (c) { return c.suit; });
        var flush = suits.every(function (s) { return s === suits[0]; });
        var cnt = {};
        cs.forEach(function (c) { cnt[c.rank] = (cnt[c.rank] || 0) + 1; });
        var uniq = Object.keys(cnt).map(Number).sort(function (a, b) { return b - a; });
        var counts = uniq.map(function (r) { return cnt[r]; }).sort(function (a, b) { return b - a; });
        var straight = false;
        if (uniq.length === 5) {
            if (uniq[0] - uniq[4] === 4) straight = true;
            else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straight = true; // A-2-3-4-5
        }
        var royal = straight && flush && uniq[0] === 14 && uniq[4] === 10;
        if (counts[0] === 5) return { cat: 9, royal: false };
        if (straight && flush) return { cat: 8, royal: royal };
        if (counts[0] === 4) return { cat: 7, royal: false };
        if (counts[0] === 3 && counts[1] === 2) return { cat: 6, royal: false };
        if (flush) return { cat: 5, royal: false };
        if (straight) return { cat: 4, royal: false };
        if (counts[0] === 3) return { cat: 3, royal: false };
        return { cat: 0, royal: false };  // two pair / pair / high all pay nothing
    }
    function toCode(ev, usedWild) {
        switch (ev.cat) {
            case 9: return '_5K';
            case 8: return ev.royal ? (usedWild ? 'DR' : 'NR') : 'SF';
            case 7: return '_4K';
            case 6: return 'FH';
            case 5: return 'FL';
            case 4: return 'ST';
            case 3: return '_3K';
            default: return '-';
        }
    }
    function payOf(code) { return code === '-' ? 0 : (PAYTABLE[code] ? PAYTABLE[code][0] : 0); }

    // evaluate a 5-card hand under Deuces Wild rules -> pay code
    function evalHand(idxs) {
        var cs = idxs.map(card);
        var wilds = cs.filter(function (c) { return c.rank === 2; }).length;
        var others = cs.filter(function (c) { return c.rank !== 2; });
        if (wilds === 4) return '_4D';
        if (wilds === 0) return toCode(natEval(others), false);

        // assign each wild one of 52 cards; keep the best-paying code
        var best = '-', bestPay = -1;
        var CANDS = [];
        for (var rk = 3; rk <= 14; rk++) for (var st = 0; st < 4; st++) CANDS.push({ rank: rk, suit: st });
        // rank 2 is never a natural card here (all 2s are wild), so candidates 3..14

        function recurse(k, acc) {
            if (k === wilds) {
                var code = toCode(natEval(others.concat(acc)), true);
                var p = payOf(code);
                if (p > bestPay) { bestPay = p; best = code; }
                return;
            }
            for (var i = 0; i < CANDS.length; i++) recurse(k + 1, acc.concat([CANDS[i]]));
        }
        recurse(0, []);
        return best;
    }

    function gameDataResponse() {
        store(RND_KEY, '');
        var o = {};
        HAND_ORDER.forEach(function (h) { for (var c = 1; c <= 5; c++) o[h + '_' + c] = PAYTABLE[h][c - 1]; });
        o.blocknote = ''; o.iserr = 0; o.maxbet = MAXB.toFixed(2); o.gameid = 0;
        o.messageids = ''; o.coinvalue = '1.00'; o.minbet = MINB.toFixed(2);
        o.newbalance = getBal().toFixed(2); o.tcounter = '';
        o.allowedcoinvalues = CVALS.map(function (v) { return v.toFixed(2); }).join(',');
        o.allowedcoinvaluesd = CVALSD.join(',');
        o.jackpot = ''; o.sessionid = 1; o.tcountertype = ''; o.availablebalance = '';
        return kv(o);
    }

    function dealResponse(p) {
        var cv = parseFloat(p.coinValue || p.coinvalue); if (isNaN(cv) || cv <= 0) cv = CVALS[0];
        var coins = parseInt(p.coinsBet || p.coinsbet, 10); if (isNaN(coins) || coins < 1) coins = 1; if (coins > 5) coins = 5;
        var bet = r2(cv * coins);
        if (bet > getBal() + 1e-9) return kv({ blocknote: encodeURIComponent('Insufficient balance'), iserr: 1, ingame: 0, newbalance: getBal().toFixed(2), messageids: '' });
        setBal(r2(getBal() - bet));
        var deck = []; for (var n = 1; n <= 52; n++) deck.push(n);
        for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
        var hand = deck.slice(0, 5);
        var gid = nextGid();
        store(RND_KEY, JSON.stringify({ gid: gid, deck: deck, hand: hand, ptr: 5, cv: cv, coins: coins }));
        var code = evalHand(hand);
        var o = { jackpot: '', blocknote: '', availablebalance: '', gameid: gid, newbalance: getBal().toFixed(2),
            result: code === '-' ? '-' : code.replace(/^_/, ''), ingame: 1, iserr: 0, tcounter: '', messageids: '', lastgameid: gid };
        for (var k = 0; k < 5; k++) { o['c' + (k + 1)] = hand[k]; o['h' + (k + 1)] = 'N'; }
        o.c6 = ''; o.c7 = ''; o.h6 = 'N'; o.h7 = 'N';
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv(o);
    }

    function hitResponse(p) {
        var st = null; try { st = JSON.parse(load(RND_KEY)); } catch (e) {}
        if (!st) return kv({ blocknote: encodeURIComponent('No active game'), iserr: 1, ingame: 0, newbalance: getBal().toFixed(2) });
        var hand = st.hand.slice();
        for (var i = 0; i < 5; i++) {
            if ((p['R' + (i + 1)] || p['r' + (i + 1)] || 'N').toUpperCase() === 'Y') { hand[i] = st.deck[st.ptr]; st.ptr += 1; }
        }
        var code = evalHand(hand);
        var pay = (code !== '-' && PAYTABLE[code]) ? PAYTABLE[code][st.coins - 1] : 0;
        var win = r2(pay * st.cv);
        setBal(r2(getBal() + win));
        store(RND_KEY, '');
        var o = { blocknote: '', resultamt: win.toFixed(2), dbup: 'N', jackpot: '', availablebalance: '',
            newbalance: getBal().toFixed(2), result: code === '-' ? '-' : code.replace(/^_/, ''),
            ingame: 1, iserr: 0, tcounter: '', messageids: '', lastgameid: st.gid };
        for (var k = 0; k < 5; k++) { o['c' + (k + 1)] = hand[k]; o['h' + (k + 1)] = 'N'; }
        o.c6 = ''; o.c7 = ''; o.h6 = 'N'; o.h7 = 'N';
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv(o);
    }

    function heartbeatResponse() {
        return kv({ errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2), availablebalance: '',
            jackpot: '', mysts: '', tcounter: '', messageids: '', blocknote: '' });
    }

    function install($) {
        if (!$ || !$.ajax || $.__vpOffline) return false;
        var realAjax = $.ajax;
        function fakeJqXHR() { var a = { readyState: 4, status: 200 }; a.done = a.fail = a.always = a.then = function () { return a; }; return a; }
        $.ajax = function (url, options) {
            if (typeof url === 'object') { options = url; url = options.url; }
            options = options || {};
            var u = String(url || options.url || '').toLowerCase();
            if (u.indexOf('getlangxml') >= 0) {
                var opts = {}; for (var kk in options) opts[kk] = options[kk];
                opts.url = CFG.langUrl || '../GetLangXml.xml';
                return realAjax.call($, opts);
            }
            var body = null;
            if (u.indexOf('getgamedata.aspx') >= 0) body = gameDataResponse();
            else if (u.indexOf('deal.aspx') >= 0) body = dealResponse(parseBody(options.data));
            else if (u.indexOf('hit.aspx') >= 0) body = hitResponse(parseBody(options.data));
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
        $.__vpOffline = true;
        if (window.console) console.log('%c[offline] deuces wild video poker backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 150) clearInterval(t); }, 20); }

    window.VpOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); store(RND_KEY, ''); },
        getBalance: function () { return getBal(); },
        _evalHand: evalHand, _card: card
    };
})();
