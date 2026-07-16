/*
 * mock-server.js  —  Offline server emulator for Blackjack Single Hand (BJ-SH)
 *
 * The original game is a thin client: every action (Deal / Hit / Double /
 * Stand / Surrender / Insurance) is a POST to an .aspx endpoint and the server
 * returns the cards + result. This file intercepts jQuery $.ajax and answers
 * those endpoints locally with a self-contained blackjack engine, so the game
 * runs fully offline with no casino server.
 *
 * Card codes: 1..52. rankIndex = (code-1) % 13   (0=A,1=2,..,9=10,10=J,11=Q,12=K)
 * Image for a card = <code>.png ; 60.png = face-down back.
 * Response field format reverse-engineered from web-connector.js parsers and
 * real captured server responses.
 */
(function () {
    'use strict';

    // ---- house rules ----
    var BJP   = 1.5;    // blackjack pays 3:2
    var INSP  = 2.0;    // insurance pays 2:1
    var HS17  = 0;      // 0 = dealer stands on all 17 (incl. soft 17)
    var MINB  = 1.00;
    var MAXB  = 100.00;
    var START_BALANCE = 2000.00;
    var BAL_KEY = 'bjsh_offline_balance';

    // ---- option bits (must match bjk-sh.js) ----
    var EARLY_INSURANCE = 1;
    var LATE_HIT        = 16;
    var LATE_STAND      = 32;
    var LATE_SPLIT      = 64;    // split intentionally left out of v1
    var LATE_DOUBLE     = 128;
    var LATE_SURRENDER  = 256;

    // ---- balance persistence ----
    function getBal() {
        var b = parseFloat(localStorage.getItem(BAL_KEY));
        if (isNaN(b)) { b = START_BALANCE; setBal(b); }
        return b;
    }
    function setBal(b) { localStorage.setItem(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }

    // ---- card helpers ----
    function cardValue(code) {
        var r = (code - 1) % 13;      // 0=A,1=2..8=9,9=10,10=J,11=Q,12=K
        if (r === 0) return 11;       // ace (soft)
        if (r >= 9)  return 10;       // 10,J,Q,K
        return r + 1;                 // 2..9
    }
    function total(cards) {
        var t = 0, aces = 0, i;
        for (i = 0; i < cards.length; i++) {
            var v = cardValue(cards[i]);
            t += v;
            if (v === 11) aces++;
        }
        while (t > 21 && aces > 0) { t -= 10; aces--; }
        return t;
    }
    function isBlackjack(cards) { return cards.length === 2 && total(cards) === 21; }

    function makeDeck() {
        // 6-deck shoe, shuffled
        var d = [], deckN, code;
        for (deckN = 0; deckN < 6; deckN++) {
            for (code = 1; code <= 52; code++) d.push(code);
        }
        for (var i = d.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = d[i]; d[i] = d[j]; d[j] = tmp;
        }
        return d;
    }

    // ---- current round state ----
    var G = null;   // { deck, player, dealer, bet, over, insuranceOffered, insuranceBet, hid }
    var HID_SEQ = 100000000;

    function draw() { return G.deck.pop(); }

    // options available to the player right now (before game over)
    function playerOptions() {
        if (!G || G.over) return 0;
        var opts = LATE_HIT | LATE_STAND;
        if (G.player.length === 2) {
            opts |= LATE_DOUBLE;
            opts |= LATE_SURRENDER;
        }
        return opts;
    }

    // Play out the dealer hand per house rules, then settle.
    function dealerPlayAndSettle() {
        var dt = total(G.dealer);
        while (dt < 17) { G.dealer.push(draw()); dt = total(G.dealer); }
        // (HS17==0 -> stand on soft 17, which the loop above already does)

        var pt = total(G.player);
        var bet = G.bet;
        var res = 0;            // net profit/loss on the main bet
        var playerBJ = isBlackjack(G.player);
        var dealerBJ = isBlackjack(G.dealer);

        if (pt > 21) {
            res = -bet;                          // player busted
        } else if (playerBJ && !dealerBJ) {
            res = bet * BJP;                      // natural blackjack
        } else if (dealerBJ && !playerBJ) {
            res = -bet;
        } else if (dt > 21) {
            res = bet;                           // dealer busted
        } else if (pt > dt) {
            res = bet;
        } else if (pt < dt) {
            res = -bet;
        } else {
            res = 0;                             // push
        }

        // settle insurance side bet (placed when dealer up card is an Ace)
        if (G.insuranceBet > 0) {
            if (dealerBJ) res += G.insuranceBet * INSP;   // insurance wins 2:1
            else          res -= G.insuranceBet;          // insurance lost
        }

        // credit balance: bet(s) were removed up front, so return stake + profit
        var returned = bet + res;                // main-bet stake back +/- profit
        if (returned > 0) setBal(getBal() + returned);
        G.settledRes = res;
        G.over = true;
        return res;
    }

    // ---- response builders (x=y&... strings the client parses) ----
    function kv(obj) {
        var parts = [], k;
        for (k in obj) if (obj.hasOwnProperty(k)) parts.push(k + '=' + obj[k]);
        return parts.join('&');
    }

    function recoverResponse() {
        // fresh session, no game in progress
        return kv({
            iserr: 0, isrec: 0, hnds: 0, upds: 0,
            bal: getBal().toFixed(2),
            minb: MINB.toFixed(2), maxb: MAXB.toFixed(2),
            bjp: BJP.toFixed(4), insp: INSP.toFixed(4),
            hs17: HS17, charlie: 0, maxh: 1, maxs: 3,
            smaxb: '0.00', sminb: '0.00',
            messageids: '', lastgameid: 0, blocknote: '', availablebalance: '',
            jackpot: '', tcounter: ''
        });
    }

    function heartbeatResponse() {
        return kv({
            errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '',
            messageids: '', blocknote: ''
        });
    }

    function dealResponse() {
        var up = G.dealer[1];        // dealer up card (dc2); hole card (dc1) stays hidden
        var pt = total(G.player);
        var over = false, ops = playerOptions(), res = '';

        // Immediate resolution on a natural: if player and/or dealer blackjack.
        if (isBlackjack(G.player) || isBlackjack(G.dealer)) {
            // offer insurance only handled pre-deal; here just settle naturals
            dealerPlayAndSettle();
            over = true; ops = 0;
        }

        var out = {
            iserr: 0, hnds: 1, upds: 0,
            bal: getBal().toFixed(2),
            dc2: up,
            hid0: G.hid, c10: G.player[0], c20: G.player[1],
            tot0: pt, ops0: over ? 0 : ops, bet0: G.bet.toFixed(2),
            res0: '', pon0: 2, pod0: 1, ex0: '', ins0: '0.0000', his0: 0,
            messageids: '', lastgameid: G.hid, blocknote: '', availablebalance: '',
            isovr: over ? 1 : 0
        };
        if (over) {
            out.dc1 = G.dealer[0];
            out.dex = G.dealer.slice(2).join(',');
            out.dtot = total(G.dealer);
            out.res0 = G.settledRes.toFixed(2);
            out.tot0 = pt;
        }
        return kv(out);
    }

    // Hit or Double: add a card (double adds one then stands)
    function hitDoubleResponse(isDouble) {
        if (isDouble) {
            setBal(getBal() - G.bet);   // extra stake
            G.bet = G.bet * 2;
        }
        var card = draw();
        G.player.push(card);
        var pt = total(G.player);
        var out = {
            iserr: 0, bal: getBal().toFixed(2),
            cn: card, tot: pt,
            messageids: '', lastgameid: G.hid, blocknote: '', availablebalance: ''
        };

        var busted = pt > 21;
        if (isDouble || busted) {
            // hand is done -> dealer plays, settle
            if (!busted) dealerPlayAndSettle();
            else { G.over = true; G.settledRes = -G.bet; /* bust: stake already taken */ }
            out.ops = 0;
            out.isovr = 1;
            out.dc1 = G.dealer[0];
            out.dex = G.dealer.slice(2).join(',');
            out.dtot = total(G.dealer);
            out.hnds = 1;
            out.hid0 = G.hid; out.c10 = G.player[0]; out.c20 = G.player[1];
            out.tot0 = pt; out.ops0 = 0; out.bet0 = G.bet.toFixed(2);
            out.res0 = G.settledRes.toFixed(2); out.pon0 = 1; out.pod0 = 1;
            out.ex0 = G.player.slice(2).join(',');
        } else {
            out.ops = playerOptions() & ~LATE_DOUBLE & ~LATE_SURRENDER; // no double/surrender after a hit
            out.isovr = 0;
        }
        return kv(out);
    }

    // Stand or Surrender
    function surrStandResponse(act) {
        var out;
        if (act == LATE_SURRENDER) {
            var refund = G.bet / 2;
            setBal(getBal() + refund);      // half stake back
            G.over = true; G.settledRes = -refund;
            out = {
                iserr: 0, bal: getBal().toFixed(2), isovr: 1,
                dc1: G.dealer[0], dc2: G.dealer[1], dex: '',
                dtot: total([G.dealer[0], G.dealer[1]]),
                hnds: 1, hid0: G.hid, res0: G.settledRes.toFixed(2),
                tot0: total(G.player), bet0: G.bet.toFixed(2), ops0: 0,
                pon0: 2, pod0: 1, ex0: G.player.slice(2).join(','),
                messageids: '', lastgameid: G.hid, blocknote: '', availablebalance: ''
            };
            return kv(out);
        }
        // STAND -> dealer plays
        dealerPlayAndSettle();
        out = {
            iserr: 0, bal: getBal().toFixed(2), isovr: 1,
            dc1: G.dealer[0], dc2: G.dealer[1],
            dex: G.dealer.slice(2).join(','),
            dtot: total(G.dealer),
            hnds: 1, hid0: G.hid, res0: G.settledRes.toFixed(2),
            tot0: total(G.player), bet0: G.bet.toFixed(2), ops0: 0,
            pon0: 2, pod0: 1, ex0: G.player.slice(2).join(','),
            messageids: '', lastgameid: G.hid, blocknote: '', availablebalance: ''
        };
        return kv(out);
    }

    function earlyResponse(params) {
        // insurance / even-money / start-late.  act1: 1=insurance, 8=startlate
        var act = parseInt(params.act1, 10);
        if (act === EARLY_INSURANCE) {
            G.insuranceBet = G.bet / 2;
            setBal(getBal() - G.insuranceBet);
        }
        // proceed to normal play: return current player options
        return kv({
            iserr: 0, bal: getBal().toFixed(2), isovr: 0,
            hnds: 1, hid0: G.hid, c10: G.player[0], c20: G.player[1],
            tot0: total(G.player), ops0: playerOptions(), bet0: G.bet.toFixed(2),
            res0: '', pon0: 2, pod0: 1, ex0: '', ins0: G.insuranceBet ? G.insuranceBet.toFixed(4) : '0.0000',
            messageids: '', lastgameid: G.hid, blocknote: '', availablebalance: ''
        });
    }

    // parse "a=b&c=d" body into object
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

    // ---- route a request URL+body to a response string, or null to pass through ----
    function handle(url, body) {
        var u = String(url).toLowerCase();
        var p = parseBody(body);

        if (u.indexOf('recover.aspx') >= 0) {
            G = null;
            return recoverResponse();
        }
        if (u.indexOf('heartbeat.aspx') >= 0) {
            return heartbeatResponse();
        }
        if (u.indexOf('deal.aspx') >= 0) {
            var bet = (parseFloat(p.amt1) || 0) + (parseFloat(p.amt2) || 0) + (parseFloat(p.amt3) || 0);
            if (bet < MINB) bet = MINB;
            if (bet > MAXB) bet = MAXB;
            G = {
                deck: makeDeck(), player: [], dealer: [],
                bet: bet, over: false, insuranceBet: 0, hid: (++HID_SEQ)
            };
            setBal(getBal() - bet);                 // take the stake
            G.player.push(draw()); G.dealer.push(draw());   // p1, dealer hole
            G.player.push(draw()); G.dealer.push(draw());   // p2, dealer up
            return dealResponse();
        }
        if (u.indexOf('hitdouble.aspx') >= 0) {
            var isDouble = (parseInt(p.act, 10) === LATE_DOUBLE);
            return hitDoubleResponse(isDouble);
        }
        if (u.indexOf('surrstand.aspx') >= 0) {
            return surrStandResponse(parseInt(p.act, 10));
        }
        if (u.indexOf('early.aspx') >= 0) {
            return earlyResponse(p);
        }
        if (u.indexOf('split.aspx') >= 0) {
            // split not supported in v1: return unchanged single hand
            return kv({ iserr: 0, bal: getBal().toFixed(2), isovr: 0, hnds: 1,
                hid0: G.hid, ops0: playerOptions() });
        }
        if (u.indexOf('enter.aspx') >= 0 || u.indexOf('game.aspx') >= 0) {
            return kv({ GAMESESSION: 'offline', errcode: 0 });
        }
        return null; // not a game endpoint -> let real ajax handle (e.g. GetLangXml)
    }

    // ---- install the interceptor once jQuery exists ----
    function install($) {
        var realAjax = $.ajax;
        $.ajax = function (a, b) {
            var opts = (typeof a === 'object') ? a : (b || {});
            if (typeof a === 'string') opts.url = a;
            var resp = null;
            try { resp = handle(opts.url, opts.data); } catch (e) {
                if (window.console) console.error('mock-server error', e);
            }
            if (resp === null) {
                return realAjax.apply(this, arguments);   // pass through
            }
            // emulate an async successful ajax with a jQuery Deferred
            var dfd = $.Deferred();
            setTimeout(function () {
                try { if (opts.success) opts.success(resp, 'success', { responseText: resp }); }
                catch (e) { if (window.console) console.error('mock success cb error', e); }
                if (opts.complete) opts.complete({ responseText: resp }, 'success');
                dfd.resolve(resp, 'success', { responseText: resp });
            }, 60);
            return dfd.promise();
        };
        if (window.console) console.log('%c[offline] mock casino server active', 'color:#28a745');
    }

    if (window.jQuery) install(window.jQuery);
    else {
        // jQuery not loaded yet; poll briefly
        var tries = 0;
        var t = setInterval(function () {
            if (window.jQuery) { clearInterval(t); install(window.jQuery); }
            else if (++tries > 200) clearInterval(t);
        }, 10);
    }
})();
