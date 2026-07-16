/*
 * offline-server.js — self-contained offline backend for Jokers Wild video poker
 * (VP_Classic_D engine, VPJW).
 *
 * The original game is a thin client: it POSTs to VideoPoker/GetGameData.aspx
 * (config + pay table), VideoPoker/Deal.aspx (deal 5 cards) and
 * VideoPoker/Hit.aspx (hold + draw), and GETs Languages/GetLangXml.aspx.  This
 * file hooks jQuery's $.ajax and answers those endpoints locally with a complete
 * Jokers Wild engine, so the untouched original UI/engine runs offline and can
 * be dropped into any site.  Field names match what the client parses.
 *
 * The pay table is the game's own captured table, so the win math matches the
 * original.  Everything is overridable via window.VP_OFFLINE_CONFIG.
 *
 * Cards: 1..52 (suit = floor((n-1)/13), rank = (n-1)%13, 0=Ace..12=King);
 * 53 = joker (fully wild).  card images are _build/img/Cards/<n>.png.
 *
 * Protocol (verified against captured responses):
 *   GetGameData -> <hand>_<coins> pay grid, minbet, maxbet, coinvalue,
 *                  allowedcoinvalues, newbalance, gameid=0
 *   Deal (coinValue, coinsBet) -> c1..c5 (five cards), h1..h7, result, gameid
 *   Hit (GameId, R1..R5 = Y replace / N hold) -> new c1..c5, result, resultamt,
 *                  newbalance
 *   win = pay[result][coinsBet] × coinValue
 */
(function () {
    'use strict';

    var CFG = window.VP_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var PERSIST = CFG.persist !== false;
    var JOKER = 53;

    var MINB = CFG.minBet != null ? CFG.minBet : 0.25;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 25.00;
    var CVALS = CFG.allowedCoinValues || [0.25, 0.50, 1.00, 2.00, 5.00];
    var CVALSD = CFG.allowedCoinValuesDisplay || ['25¢', '50¢', '$1', '$2', '$5'];

    // the game's own pay table: hand -> [pay@1coin, @2, @3, @4, @5]
    var PAYTABLE = CFG.paytable || {
        KB:  [1, 2, 3, 4, 5],
        _2P: [1, 2, 3, 4, 5],
        _3K: [2, 4, 6, 8, 10],
        ST:  [3, 6, 9, 12, 15],
        FL:  [4, 8, 12, 16, 20],
        FH:  [6, 12, 18, 24, 30],
        _4K: [20, 40, 60, 80, 100],
        SF:  [50, 100, 150, 200, 250],
        JR:  [100, 200, 300, 400, 500],
        NR:  [125, 250, 375, 500, 2000],
        _5K: [200, 400, 600, 800, 1000]
    };
    // order the pay grid is emitted in (matches the captured GetGameData)
    var HAND_ORDER = ['_2P', 'KB', '_3K', 'ST', 'FL', 'FH', '_4K', 'SF', 'JR', 'NR', '_5K'];

    var BAL_KEY = 'vp_jw_bal', GID_KEY = 'vp_jw_gid', RND_KEY = 'vp_jw_round';
    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 43470000; g += 1; store(GID_KEY, String(g)); return g; }
    function r2(v) { return Math.round(v * 100) / 100; }

    function parseBody(data) {
        var o = {}; if (!data) return o;
        String(data).split('&').forEach(function (p) { var i = p.indexOf('='); if (i < 0) { o[p] = ''; return; } o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
        return o;
    }
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    // ---- cards & Jokers Wild evaluation ---------------------------------
    function card(n) { var idx = (n - 1) % 13; return { rank: idx === 0 ? 14 : idx + 1, suit: Math.floor((n - 1) / 13) }; }

    // natural 5-card category for cards with NO joker placeholder.
    // returns { cat, royal } ; cat: 9=5oak 8=SF 7=4oak 6=FH 5=FL 4=ST 3=3oak
    // 2=2pair 1=pair 0=high ; royal = straight flush that is T-J-Q-K-A.
    function natEval(cs) {
        var ranks = cs.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
        var suits = cs.map(function (c) { return c.suit; });
        var flush = suits.every(function (s) { return s === suits[0]; });
        var cnt = {};
        ranks.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
        var counts = Object.keys(cnt).map(function (r) { return cnt[r]; }).sort(function (a, b) { return b - a; });
        var uniq = Object.keys(cnt).map(Number).sort(function (a, b) { return b - a; });
        var straight = false, high = 0;
        if (uniq.length === 5) {
            if (uniq[0] - uniq[4] === 4) { straight = true; high = uniq[0]; }
            else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) { straight = true; high = 5; } // A-2-3-4-5
        }
        var royal = straight && flush && uniq[0] === 14 && uniq[4] === 10;
        if (counts[0] === 5) return { cat: 9, royal: false };
        if (straight && flush) return { cat: 8, royal: royal };
        if (counts[0] === 4) return { cat: 7, royal: false };
        if (counts[0] === 3 && counts[1] === 2) return { cat: 6, royal: false };
        if (flush) return { cat: 5, royal: false };
        if (straight) return { cat: 4, royal: false };
        if (counts[0] === 3) return { cat: 3, royal: false };
        if (counts[0] === 2 && counts[1] === 2) return { cat: 2, royal: false };
        if (counts[0] === 2) {
            // which rank is the pair?
            var pr = uniq.filter(function (r) { return cnt[r] === 2; })[0];
            return { cat: 1, royal: false, pairRank: pr };
        }
        return { cat: 0, royal: false };
    }

    // map a natural category to a Jokers Wild pay code.
    // hasJoker=true means a royal is a Wild Royal (JR) and 5oak is possible.
    function toCode(ev, hasJoker) {
        switch (ev.cat) {
            case 9: return '_5K';
            case 8: return ev.royal ? (hasJoker ? 'JR' : 'NR') : 'SF';
            case 7: return '_4K';
            case 6: return 'FH';
            case 5: return 'FL';
            case 4: return 'ST';
            case 3: return '_3K';
            case 2: return '_2P';
            case 1: return (ev.pairRank === 14 || ev.pairRank === 13) ? 'KB' : '-';  // Kings or Aces
            default: return '-';
        }
    }
    function payRank(code) { return code === '-' ? 0 : (PAYTABLE[code] ? PAYTABLE[code][0] : 0); }

    // evaluate a 5-card hand (indices) under Jokers Wild rules -> pay code
    function evalHand(idxs) {
        var jokers = idxs.filter(function (n) { return n === JOKER || n === 54; });
        var others = idxs.filter(function (n) { return n !== JOKER && n !== 54; }).map(card);
        if (jokers.length === 0) return toCode(natEval(others), false);
        // one joker: try every substitute, take the best-paying code
        var best = '-', bestPay = -1;
        for (var rk = 2; rk <= 14; rk++) {
            for (var st = 0; st < 4; st++) {
                var hand = others.concat([{ rank: rk, suit: st }]);
                var code = toCode(natEval(hand), true);
                var pay = payRank(code);
                if (pay > bestPay) { bestPay = pay; best = code; }
            }
        }
        return best;
    }

    // ---- responses -------------------------------------------------------
    function gameDataResponse() {
        store(RND_KEY, '');
        var o = {};
        HAND_ORDER.forEach(function (h) {
            for (var c = 1; c <= 5; c++) o[h + '_' + c] = PAYTABLE[h][c - 1];
        });
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
        if (bet > getBal() + 1e-9) {
            return kv({ blocknote: encodeURIComponent('Insufficient balance'), iserr: 1, ingame: 0,
                newbalance: getBal().toFixed(2), messageids: '' });
        }
        setBal(r2(getBal() - bet));

        // shuffle a 53-card deck (52 + joker)
        var deck = []; for (var n = 1; n <= 53; n++) deck.push(n);
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
            var replace = (p['R' + (i + 1)] || p['r' + (i + 1)] || 'N').toUpperCase() === 'Y';
            if (replace) { hand[i] = st.deck[st.ptr]; st.ptr += 1; }
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
        if (window.console) console.log('%c[offline] jokers wild video poker backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 150) clearInterval(t); }, 20); }

    window.VpOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); store(RND_KEY, ''); },
        getBalance: function () { return getBal(); },
        _evalHand: evalHand, _card: card
    };
})();
