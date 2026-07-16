/*
 * offline-server.js — self-contained offline backend for Three Card Poker.
 *
 * The original game is a thin client: it POSTs to ThreeCardPoker/Start.aspx
 * (session/limits), Deal.aspx (deal + place ante/pair-plus) and Call.aspx
 * (play or fold), and GETs Languages/GetLangXml.aspx.  This file hooks jQuery's
 * $.ajax and answers those endpoints locally with a complete Three Card Poker
 * engine, so the untouched original UI/engine runs offline and can be dropped
 * into any site.  Field names match exactly what web-connector.js parses.
 *
 * Protocol (verified against captured responses):
 *   Start           -> minbet, maxbet, prizes (pay tables), gameid=0, balance
 *   Deal (anteAmt,   -> pc1..pc3 (player's 3 cards), ph (hand code); the round
 *         pairplusAmt)   waits for Call.  If anteAmt==0 (pair-plus only) it
 *                        resolves immediately and also returns dc1..dc3/results.
 *   Call (Call=Y|N)  -> dc1..dc3 (dealer), dh (dealer hand code), anteres,
 *                        ppres, bonusres, resultamt (net), newbalance.
 *
 * Cards are 1..52: suit = floor((n-1)/13), rank = (n-1)%13 (0=Ace..12=King).
 * Ranking (3-card): straight flush > trips > straight > flush > pair > high.
 * Dealer qualifies with Queen-high or better.  Pay tables are configurable.
 */
(function () {
    'use strict';

    var CFG = window.TCP_OFFLINE_CONFIG || {};
    var START_BALANCE = CFG.startBalance != null ? CFG.startBalance : 2000.00;
    var MINB = CFG.minBet != null ? CFG.minBet : 1.00;
    var MAXB = CFG.maxBet != null ? CFG.maxBet : 100.00;
    var PERSIST = CFG.persist !== false;

    // pay tables (profit-to-1). Ante bonus: straight/trips/straight-flush.
    var ANTE_BONUS = CFG.anteBonus || { ST: 1, '3K': 4, SF: 5 };
    // pair plus: pair/flush/straight/trips/straight-flush.
    var PAIR_PLUS = CFG.pairPlus || { '2K': 1, FL: 4, ST: 6, '3K': 25, SF: 40 };

    var BAL_KEY = 'tcp_offline_bal', GID_KEY = 'tcp_offline_gid', RND_KEY = 'tcp_offline_round';

    var mem = {};
    function store(k, v) { if (PERSIST) { try { localStorage.setItem(k, v); return; } catch (e) {} } mem[k] = v; }
    function load(k) { if (PERSIST) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} } return k in mem ? mem[k] : null; }
    function getBal() { var b = parseFloat(load(BAL_KEY)); if (isNaN(b)) { b = START_BALANCE; setBal(b); } return b; }
    function setBal(b) { store(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function nextGid() { var g = parseInt(load(GID_KEY), 10); if (isNaN(g)) g = 30410000; g += 1; store(GID_KEY, String(g)); return g; }
    function r2(v) { return Math.round(v * 100) / 100; }

    function parseBody(data) {
        var o = {}; if (!data) return o;
        String(data).split('&').forEach(function (p) {
            var i = p.indexOf('='); if (i < 0) { o[p] = ''; return; }
            o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1));
        });
        return o;
    }
    function kv(obj) { var a = [], k; for (k in obj) if (obj.hasOwnProperty(k)) a.push(k + '=' + obj[k]); return a.join('&'); }

    // ---- cards & 3-card evaluation --------------------------------------
    function card(n) { var idx = (n - 1) % 13; return { rank: idx === 0 ? 14 : idx + 1, suit: Math.floor((n - 1) / 13) }; }

    // returns { code, score[] } — higher score wins; code is the hand string.
    function eval3(cards) {
        var ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
        var suits = cards.map(function (c) { return c.suit; });
        var flush = suits[0] === suits[1] && suits[1] === suits[2];

        // straight: 3 consecutive; A-2-3 (wheel) and A-K-Q both allowed
        var u = ranks.slice();
        var straight = false, straightHigh = 0;
        if (u[0] - u[1] === 1 && u[1] - u[2] === 1) { straight = true; straightHigh = u[0]; }
        else if (u[0] === 14 && u[1] === 3 && u[2] === 2) { straight = true; straightHigh = 3; } // A-2-3 wheel (lowest)

        var trips = ranks[0] === ranks[1] && ranks[1] === ranks[2];
        var pairRank = 0, kicker = 0;
        if (!trips) {
            if (ranks[0] === ranks[1]) { pairRank = ranks[0]; kicker = ranks[2]; }
            else if (ranks[1] === ranks[2]) { pairRank = ranks[1]; kicker = ranks[0]; }
        }

        if (straight && flush) return { code: 'SF', score: [5, straightHigh] };
        if (trips) return { code: '3K', score: [4, ranks[0]] };
        if (straight) return { code: 'ST', score: [3, straightHigh] };
        if (flush) return { code: 'FL', score: [2].concat(ranks) };
        if (pairRank) return { code: '2K', score: [1, pairRank, kicker] };
        return { code: '-', score: [0].concat(ranks) };
    }
    function cmp(x, y) { for (var i = 0; i < Math.max(x.length, y.length); i++) { var a = x[i] || 0, b = y[i] || 0; if (a !== b) return a < b ? -1 : 1; } return 0; }

    // dealer qualifies with Queen-high or better
    function qualifies(ev) { return ev.score[0] > 0 || ev.score[1] >= 12; }

    function deal6() {
        var deck = []; for (var n = 1; n <= 52; n++) deck.push(n);
        for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
        return { player: deck.slice(0, 3), dealer: deck.slice(3, 6) };
    }

    // ---- endpoint handlers ----------------------------------------------
    function prizesStr() {
        // ST/3K/SF (ante bonus) then 2K+/FL+/ST+/3K+/SF+ (pair plus), as captured
        var lines = [
            'ST ' + ANTE_BONUS.ST.toFixed(2), '3K ' + ANTE_BONUS['3K'].toFixed(2), 'SF ' + ANTE_BONUS.SF.toFixed(2),
            '2K+' + PAIR_PLUS['2K'].toFixed(2), 'FL+' + PAIR_PLUS.FL.toFixed(2), 'ST+' + PAIR_PLUS.ST.toFixed(2),
            '3K+' + PAIR_PLUS['3K'].toFixed(2), 'SF+' + PAIR_PLUS.SF.toFixed(2)
        ];
        return encodeURIComponent(lines.join('\n'));
    }

    function startResponse() {
        store(RND_KEY, '');
        return kv({
            blocknote: '', iserr: 0, maxbet: MAXB.toFixed(2), gameid: 0, prizes: prizesStr(),
            messageids: '', availablebalance: '', tcounter: '', jackpot: '', sessionid: 1,
            tcountertype: '', minbet: MINB.toFixed(2), lastgameid: nextGid(), balance: getBal().toFixed(2)
        });
    }

    function heartbeatResponse() {
        return kv({ errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2), availablebalance: '',
            jackpot: '', mysts: '', tcounter: '', messageids: '', blocknote: '' });
    }
    function errResponse(msg) {
        return kv({ blocknote: '', iserr: 1, errd: encodeURIComponent(msg), messageids: '',
            balance: getBal().toFixed(2), lastgameid: nextGid() });
    }
    function publishBal() { try { if (window.Global && window.Global.Connector) window.Global.Connector.bal = getBal(); } catch (e) {} }

    function dealResponse(p) {
        var ante = parseFloat(p.anteAmt) || 0;
        var pp = parseFloat(p.pairplusAmt) || 0;
        if (ante <= 0 && pp <= 0) return errResponse('Place a bet first');
        if (ante > 0 && ante < MINB) return errResponse('Minimum bet is $' + MINB.toFixed(2));
        if (ante > MAXB || pp > MAXB) return errResponse('Maximum bet is $' + MAXB.toFixed(2));
        if (ante + pp > getBal() + 1e-9) return errResponse('Insufficient balance');

        setBal(r2(getBal() - ante - pp));
        var hands = deal6();
        var gid = nextGid();
        var pev = eval3(hands.player.map(card));

        if (ante <= 0) {
            // pair-plus only: resolves immediately, no Call
            var dev0 = eval3(hands.dealer.map(card));
            var ppMult = PAIR_PLUS[pev.code];
            var ppres, add = 0;
            if (ppMult != null) { ppres = r2(pp * ppMult); add = r2(pp + pp * ppMult); }
            else { ppres = -pp; add = 0; }
            setBal(r2(getBal() + add));
            store(RND_KEY, '');
            var o0 = {
                availablebalance: '', blocknote: '', messageids: '', jackpot: '', tcounter: '', errd: '',
                gameid: gid, lastgameid: gid, iserr: 0, ph: pev.code, dh: dev0.code,
                anteres: '0.00', bonusres: '0.00', ppres: ppres.toFixed(2), resultamt: ppres.toFixed(2),
                balance: getBal().toFixed(2)
            };
            o0.pc1 = hands.player[0]; o0.pc2 = hands.player[1]; o0.pc3 = hands.player[2];
            o0.dc1 = hands.dealer[0]; o0.dc2 = hands.dealer[1]; o0.dc3 = hands.dealer[2];
            publishBal();
            return kv(o0);
        }

        // ante round: wait for Call
        store(RND_KEY, JSON.stringify({ gid: gid, ante: ante, pp: pp, player: hands.player, dealer: hands.dealer }));
        var o = {
            availablebalance: '', blocknote: '', messageids: '', jackpot: '', tcounter: '', errd: '',
            gameid: gid, lastgameid: gid, iserr: 0, ph: pev.code, balance: getBal().toFixed(2)
        };
        o.pc1 = hands.player[0]; o.pc2 = hands.player[1]; o.pc3 = hands.player[2];
        publishBal();
        return kv(o);
    }

    function callResponse(p) {
        var st = null; try { st = JSON.parse(load(RND_KEY)); } catch (e) {}
        if (!st) return errResponse('No active game');
        var play = (p.Call || p.call || 'N').toUpperCase() === 'Y';

        var pev = eval3(st.player.map(card));
        var dev = eval3(st.dealer.map(card));

        var anteres = 0, bonusres = 0, ppres = 0, add = 0;

        // pair plus resolves regardless of play/fold (independent bet)
        if (st.pp > 0) {
            var ppMult = PAIR_PLUS[pev.code];
            if (ppMult != null) { ppres = r2(st.pp * ppMult); add += r2(st.pp + st.pp * ppMult); }
            else { ppres = -st.pp; }
        }

        if (!play) {
            // fold: forfeit ante (and its bonus)
            anteres = -st.ante;
        } else {
            setBal(r2(getBal() - st.ante));           // place the play bet (= ante)
            // ante bonus pays on the player hand regardless of the dealer
            var bMult = ANTE_BONUS[pev.code];
            if (bMult != null) { bonusres = r2(st.ante * bMult); add += bonusres; }

            if (!qualifies(dev)) {
                anteres = st.ante;                    // ante wins 1:1, play pushes
                add += st.ante + st.ante * 2;         // ante: stake+win ; play: stake back
            } else {
                var c = cmp(pev.score, dev.score);
                if (c > 0) { anteres = st.ante * 2; add += st.ante * 4; }   // ante+play both win 1:1
                else if (c < 0) { anteres = -st.ante * 2; }                 // ante+play both lost
                else { anteres = 0; add += st.ante * 2; }                   // tie: both push (stakes back)
            }
        }

        setBal(r2(getBal() + add));
        store(RND_KEY, '');
        var resultamt = r2(anteres + bonusres + ppres);

        var o = {
            availablebalance: '', blocknote: '', messageids: '', jackpot: '', tcounter: '', errd: '',
            gameid: st.gid, lastgameid: st.gid, iserr: 0, dh: dev.code,
            anteres: r2(anteres).toFixed(2), bonusres: r2(bonusres).toFixed(2),
            ppres: r2(ppres).toFixed(2), resultamt: resultamt.toFixed(2), balance: getBal().toFixed(2),
            newbalance: getBal().toFixed(2)
        };
        o.dc1 = st.dealer[0]; o.dc2 = st.dealer[1]; o.dc3 = st.dealer[2];
        publishBal();
        return kv(o);
    }

    // ---- jQuery hook -----------------------------------------------------
    function install($) {
        if (!$ || !$.ajax || $.__tcpOffline) return false;
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
            if (u.indexOf('start.aspx') >= 0) body = startResponse();
            else if (u.indexOf('deal.aspx') >= 0) body = dealResponse(parseBody(options.data));
            else if (u.indexOf('call.aspx') >= 0) body = callResponse(parseBody(options.data));
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
        $.__tcpOffline = true;
        if (window.console) console.log('%c[offline] three card poker backend active', 'color:#28a745');
        return true;
    }
    if (!install(window.jQuery)) { var tries = 0, t = setInterval(function () { if (install(window.jQuery) || ++tries > 100) clearInterval(t); }, 20); }

    window.TcpOffline = {
        resetBalance: function (v) { setBal(v != null ? v : START_BALANCE); store(RND_KEY, ''); },
        getBalance: function () { return getBal(); },
        _eval3: eval3, _card: card, _cmp: cmp, _qualifies: qualifies
    };
})();
