/*
 * offline-server.js — self-contained offline backend for Pai Gow Poker.
 *
 * The original game is a thin client: it POSTs to PaiGow/OpenGame.aspx (deal)
 * and PaiGow/CloseGame.aspx (resolve), and GETs Languages/GetLangXml.aspx.
 * This file hooks jQuery's $.ajax and answers those endpoints locally with a
 * complete pai gow poker engine, so the untouched original UI/engine runs with
 * no network and can be dropped into any site.  Field names match exactly what
 * web-connector.js / ms-server-connector.js parse.
 *
 * Protocol (verified against captured responses):
 *   OpenGame (no betamt) -> balance, minbet, maxbet, gameid=0, newgame=1
 *   OpenGame (betamt=N)  -> p1..p7 (player's 7 cards), pf1/pf2 + pb1..pb5
 *                           (house-way suggested 2-card front / 5-card back),
 *                           gameid, balance (bet already deducted)
 *   CloseGame (H1..H7 = each player card's F/B choice) ->
 *                           db1..db5 + df1/df2 (dealer back/front),
 *                           result (W/L/P), moneydelta, newbalance
 *
 * Cards are 1..52 (rank-within-suit): 1-13 = suit0 A..K, 14-26 = suit1, etc.
 * 53 = joker (semi-wild: plays as an Ace, or completes a straight/flush).
 * Win pays even money minus 5% commission (moneydelta = bet * 1.95).
 * Ties ("copies") go to the dealer.
 *
 * Config via window.PAIGOW_OFFLINE_CONFIG before this script runs.
 */
(function () {
    'use strict';

    var CFG = window.PAIGOW_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var MINB = CFG.minBet != null ? CFG.minBet : 1.00;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 100.00;
    var COMMISSION = CFG.commission != null ? CFG.commission : 0.05;
    var PERSIST = CFG.persist !== false;
    var JOKER = 53;

    var BAL_KEY = 'pgp_offline_bal', GID_KEY = 'pgp_offline_gid', HAND_KEY = 'pgp_offline_hand';

    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }

    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 4240000; g += 1; store(GID_KEY, String(g)); return g; }
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
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    // ---- cards -----------------------------------------------------------
    // card index -> {rank, suit, joker}.  rank value: A=14, K=13 … 2=2.
    function card(n) {
        if (n === JOKER || n === 54) return { joker: true, rank: 14, suit: -1 };
        var idx = (n - 1) % 13;             // 0=Ace .. 12=King
        var suit = Math.floor((n - 1) / 13);
        return { joker: false, rank: idx === 0 ? 14 : idx + 1, suit: suit };
    }

    // Standard 5-card score with NO joker. Returns comparable array
    // [category, tie1, tie2, …]; higher is better. Pai gow rule: A-2-3-4-5 is
    // the SECOND-highest straight (ranks just under A-K-Q-J-10).
    function score5(cards) {
        var ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
        var suits = cards.map(function (c) { return c.suit; });
        var flush = suits.every(function (s) { return s === suits[0]; });

        // rank counts
        var cnt = {};
        ranks.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
        var groups = Object.keys(cnt).map(function (r) { return [cnt[r], parseInt(r, 10)]; });
        groups.sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });   // by count, then rank

        // straight detection
        var uniq = Object.keys(cnt).map(Number).sort(function (a, b) { return b - a; });
        var straightHigh = 0, isWheel = false;
        if (uniq.length === 5) {
            if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
            else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) { straightHigh = 5; isWheel = true; } // A2345
        }
        // pai gow: wheel ranks second-highest -> treat its "high" as 14.5
        var straightRank = isWheel ? 14.5 : straightHigh;

        if (straightHigh && flush) return [8, straightRank];
        if (groups[0][0] === 4) return [7, groups[0][1], groups[1][1]];
        if (groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
        if (flush) return [5].concat(ranks);
        if (straightHigh) return [4, straightRank];
        if (groups[0][0] === 3) return [3, groups[0][1]].concat(kickers(groups, 3));
        if (groups[0][0] === 2 && groups[1][0] === 2)
            return [2, Math.max(groups[0][1], groups[1][1]), Math.min(groups[0][1], groups[1][1])].concat(kickers(groups, 2, 2));
        if (groups[0][0] === 2) return [1, groups[0][1]].concat(kickers(groups, 2));
        return [0].concat(ranks);
    }
    function kickers(groups, usedCount, usedCount2) {
        var out = [];
        groups.forEach(function (g) {
            if (g[0] === usedCount || g[0] === usedCount2) return;
            for (var i = 0; i < g[0]; i++) out.push(g[1]);
        });
        return out.sort(function (a, b) { return b - a; });
    }

    // 5-card evaluation honoring the semi-wild joker.
    function eval5(cards) {
        var ji = -1;
        for (var i = 0; i < cards.length; i++) if (cards[i].joker) { ji = i; break; }
        if (ji < 0) return score5(cards);
        // joker is legal only as an Ace, or to complete a straight/flush/straight-flush.
        var best = null;
        for (var rk = 2; rk <= 14; rk++) {
            for (var st = 0; st < 4; st++) {
                var trial = cards.slice();
                trial[ji] = { joker: false, rank: rk, suit: st };
                var s = score5(trial);
                var legal = (rk === 14) || s[0] === 8 || s[0] === 5 || s[0] === 4; // ace, or SF/flush/straight
                if (!legal) continue;
                if (!best || cmp(s, best) > 0) best = s;
            }
        }
        // fallback (shouldn't happen): joker as ace of an unused suit
        if (!best) { var t = cards.slice(); t[ji] = { joker: false, rank: 14, suit: 0 }; best = score5(t); }
        return best;
    }

    // 2-card front: pair or high card (joker = Ace).
    function eval2(cards) {
        var a = cards.map(function (c) { return c.joker ? 14 : c.rank; }).sort(function (x, y) { return y - x; });
        if (a[0] === a[1]) return [1, a[0]];
        return [0, a[0], a[1]];
    }

    function cmp(x, y) {
        for (var i = 0; i < Math.max(x.length, y.length); i++) {
            var a = x[i] || 0, b = y[i] || 0;
            if (a !== b) return a < b ? -1 : 1;
        }
        return 0;
    }

    // Is a 2-card front legally lower than a 5-card back? (no foul)
    function frontLEback(front2, back5) {
        var f = eval2(front2), b = eval5(back5);
        if (b[0] >= 2) return true;                       // two pair or better always outranks a 2-card hand
        if (b[0] === 1) {                                 // back is one pair
            if (f[0] === 1) return b[1] >= f[1];          // both pairs: back pair must be >=
            return true;                                  // back pair beats front high card
        }
        // back is high card
        if (f[0] === 1) return false;                     // front pair vs back high card -> foul
        // both high card: compare top two
        return cmp([b[1], b[2]], [f[1], f[2]]) >= 0;
    }

    // House way: among all 21 ways to pick the 2 front cards, keep the legal
    // (non-foul) splits and choose the one with the strongest back, then front.
    function houseWay(seven) {
        var best = null;
        for (var i = 0; i < 7; i++) {
            for (var j = i + 1; j < 7; j++) {
                var front = [seven[i], seven[j]];
                var back = [];
                for (var k = 0; k < 7; k++) if (k !== i && k !== j) back.push(seven[k]);
                if (!frontLEback(front, back)) continue;
                var bs = eval5(back), fs = eval2(front);
                var cand = { fi: i, fj: j, back: bs, front: fs };
                if (!best || cmp(bs, best.back) > 0 || (cmp(bs, best.back) === 0 && cmp(fs, best.front) > 0))
                    best = cand;
            }
        }
        // fallback: two lowest cards to front (always legal)
        if (!best) {
            var order = seven.map(function (c, idx) { return idx; })
                .sort(function (a, b) { return eval2([seven[a]])[0] - eval2([seven[b]])[0]; });
            best = { fi: order[0], fj: order[1], back: null, front: null };
        }
        return best;
    }

    // ---- deal / settle ---------------------------------------------------
    function dealHands() {
        var deck = [];
        for (var n = 1; n <= 53; n++) deck.push(n);       // 52 cards + one joker
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
        }
        return { player: deck.slice(0, 7), dealer: deck.slice(7, 14) };
    }

    function openResponse(params) {
        var betRaw = params.betamt;
        if (betRaw == null || betRaw === '') {
            // initial handshake: no deal
            return kv({
                blocknote: '', iserr: 0, maxbet: MAXB.toFixed(2), gameid: 0, messageids: '',
                newgame: 1, availablebalance: '', tcounter: '', jackpot: '', sessionid: 0,
                tcountertype: '', minbet: MINB.toFixed(2), lastgameid: nextGid(), balance: getBal().toFixed(2)
            });
        }
        var bet = parseFloat(betRaw);
        if (isNaN(bet) || bet < MINB) return errResponse('Minimum bet is $' + MINB.toFixed(2));
        if (bet > MAXB) return errResponse('Maximum bet is $' + MAXB.toFixed(2));
        if (bet > getBal() + 1e-9) return errResponse('Insufficient balance');

        setBal(r2(getBal() - bet));
        var hands = dealHands();
        var gid = nextGid();

        // house-way suggestion for the player's 7 cards
        var pc = hands.player.map(card);
        var hw = houseWay(pc);
        var frontIdx = [hw.fi, hw.fj];
        var pf = frontIdx.map(function (ix) { return hands.player[ix]; });
        var pb = [];
        for (var k = 0; k < 7; k++) if (k !== hw.fi && k !== hw.fj) pb.push(hands.player[k]);

        // persist the round for CloseGame
        store(HAND_KEY, JSON.stringify({ gid: gid, bet: bet, player: hands.player, dealer: hands.dealer }));

        var out = {
            availablebalance: '', blocknote: '', messageids: '', jackpot: '', tcounter: '',
            gameid: gid, lastgameid: gid, iserr: 0, newgame: 1, balance: getBal().toFixed(2), betamt: bet
        };
        for (var p = 0; p < 7; p++) out['p' + (p + 1)] = hands.player[p];
        out.pf1 = pf[0]; out.pf2 = pf[1];
        for (var b = 0; b < 5; b++) out['pb' + (b + 1)] = pb[b];
        // h1..h7: F/B per dealt card (kept for parity with the original response)
        for (var h = 0; h < 7; h++) out['h' + (h + 1)] = (frontIdx.indexOf(h) >= 0) ? 'F' : 'B';
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv(out);
    }

    function closeResponse(params) {
        var st = null;
        try { st = JSON.parse(load(HAND_KEY)); } catch (e) {}
        if (!st) return errResponse('No active game');

        // player's chosen split: H1..H7 = 'F' or 'B' for each dealt card
        var pFront = [], pBack = [];
        for (var i = 0; i < 7; i++) {
            var pos = (params['H' + (i + 1)] || 'B').toUpperCase();
            (pos === 'F' ? pFront : pBack).push(st.player[i]);
        }
        // guard against an illegal split coming from a tampered client
        if (pFront.length !== 2 || pBack.length !== 5) {
            var hw0 = houseWay(st.player.map(card));
            pFront = [st.player[hw0.fi], st.player[hw0.fj]];
            pBack = st.player.filter(function (_, k) { return k !== hw0.fi && k !== hw0.fj; });
        }

        // dealer plays the house way
        var dc = st.dealer.map(card);
        var dhw = houseWay(dc);
        var dFront = [st.dealer[dhw.fi], st.dealer[dhw.fj]];
        var dBack = st.dealer.filter(function (_, k) { return k !== dhw.fi && k !== dhw.fj; });

        var pfE = eval2(pFront.map(card)), pbE = eval5(pBack.map(card));
        var dfE = eval2(dFront.map(card)), dbE = eval5(dBack.map(card));

        var result, moneydelta;
        var foul = !frontLEback(pFront.map(card), pBack.map(card));
        if (foul) {
            result = 'L'; moneydelta = 0;
        } else {
            var backWin = cmp(pbE, dbE) > 0;      // ties -> dealer
            var frontWin = cmp(pfE, dfE) > 0;
            if (backWin && frontWin) { result = 'W'; moneydelta = r2(st.bet * (2 - COMMISSION)); }
            else if (!backWin && !frontWin) { result = 'L'; moneydelta = 0; }
            else { result = 'P'; moneydelta = r2(st.bet); }   // push: stake back
        }
        setBal(r2(getBal() + moneydelta));
        store(HAND_KEY, '');

        var out = {
            availablebalance: '', blocknote: '', messageids: '', jackpot: '', tcounter: '',
            gameid: st.gid, lastgameid: st.gid, iserr: 0,
            result: result, moneydelta: moneydelta.toFixed(2), newbalance: getBal().toFixed(2)
        };
        out.db1 = dBack[0]; out.db2 = dBack[1]; out.db3 = dBack[2]; out.db4 = dBack[3]; out.db5 = dBack[4];
        out.df1 = dFront[0]; out.df2 = dFront[1];
        try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {}
        return kv(out);
    }

    function heartbeatResponse() {
        return kv({ errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '', messageids: '', blocknote: '' });
    }
    function errResponse(msg) {
        return kv({ blocknote: '', iserr: 1, errd: encodeURIComponent(msg), messageids: '',
            balance: getBal().toFixed(2), newbalance: getBal().toFixed(2), lastgameid: nextGid() });
    }

    // ---- jQuery hook -----------------------------------------------------
    function install($) {
        if (!$ || !$.ajax || $.__pgpOffline) return false;
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
            if (u.indexOf('opengame.aspx') >= 0) body = openResponse(parseBody(options.data));
            else if (u.indexOf('closegame.aspx') >= 0) body = closeResponse(parseBody(options.data));
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
        $.__pgpOffline = true;
        if (window.console) console.log('%c[offline] pai gow poker backend active', 'color:#28a745');
        return true;
    }

    if (!install(window.jQuery)) {
        var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 100) clearInterval(t); }, 20);
    }

    window.PaiGowOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); store(HAND_KEY, ''); },
        getBalance: function () { return getBal(); },
        // exposed for tests
        _eval5: eval5, _eval2: eval2, _card: card, _houseWay: houseWay, _cmp: cmp, _frontLEback: frontLEback
    };
})();
