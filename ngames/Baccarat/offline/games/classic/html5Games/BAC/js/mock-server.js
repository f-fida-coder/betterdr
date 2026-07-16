/*
 * mock-server.js  —  Offline server emulator for Baccarat (BAC)
 *
 * The original game is a thin client: Deal is a POST to Baccarat/Deal.aspx and
 * the server returns the cards + result. This file intercepts jQuery $.ajax
 * (Init/Deal/Heartbeat) and XMLHttpRequest (DynamicHistory) and answers those
 * endpoints locally with a self-contained punto-banco engine, so the game runs
 * fully offline with no casino server.
 *
 * Card codes: 1..52. rankIndex = (code-1) % 13  (0=A,1=2,..,9=10,10=J,11=Q,12=K)
 * Baccarat value: A=1, 2..9 = face value, 10/J/Q/K = 0.
 * Response field format reverse-engineered from web-connector.js parsers and
 * real captured server responses:
 *   rslt       = net result of the whole round (bal_after = bal_before + rslt)
 *   bankerrslt = net win of the banker bet alone (0 unless banker wins)
 *   ppre/bpre  = two-card totals, ptot/btot = final totals
 */
(function () {
    'use strict';

    // ---- house rules ----
    var COMM  = 5.00;      // banker commission %
    var TIEP  = 8.0;       // tie pays 8:1
    var MINB  = 1.00;
    var MAXB  = 500.00;
    var START_BALANCE = 2000.00;
    var BAL_KEY  = 'bac_offline_balance';
    var HIST_KEY = 'bac_offline_history';

    // ---- balance persistence ----
    function getBal() {
        var b = parseFloat(localStorage.getItem(BAL_KEY));
        if (isNaN(b)) { b = START_BALANCE; setBal(b); }
        return b;
    }
    function setBal(b) { localStorage.setItem(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }

    // ---- card helpers ----
    function bacValue(code) {
        var r = (code - 1) % 13;      // 0=A,1=2..8=9,9=10,10=J,11=Q,12=K
        if (r === 0) return 1;        // ace
        if (r >= 9)  return 0;        // 10,J,Q,K
        return r + 1;                 // 2..9
    }
    function total(cards) {
        var t = 0;
        for (var i = 0; i < cards.length; i++) t += bacValue(cards[i]);
        return t % 10;
    }
    function makeShoe() {
        // 8-deck shoe, shuffled (fresh each round — same odds, no state to recover)
        var d = [], deckN, code;
        for (deckN = 0; deckN < 8; deckN++) {
            for (code = 1; code <= 52; code++) d.push(code);
        }
        for (var i = d.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = d[i]; d[i] = d[j]; d[j] = tmp;
        }
        return d;
    }

    var GAMEID = parseInt(localStorage.getItem('bac_offline_gameid'), 10) || 10000000;
    function nextGameId() {
        GAMEID++;
        localStorage.setItem('bac_offline_gameid', GAMEID);
        return GAMEID;
    }

    // running stats: [playerWins, bankerWins, ties, 0, 0, rounds, 0]
    var STATS = (localStorage.getItem('bac_offline_stats') || '0,0,0,0,0,0,0').split(',').map(Number);
    function saveStats() { localStorage.setItem('bac_offline_stats', STATS.join(',')); }

    // ---- history (last 20 rounds, rendered for the History window) ----
    function getHist() {
        try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
        catch (e) { return []; }
    }
    function pushHist(row) {
        var h = getHist();
        h.unshift(row);
        if (h.length > 20) h.length = 20;
        localStorage.setItem(HIST_KEY, JSON.stringify(h));
    }
    function cardName(code) {
        var r = (code - 1) % 13;
        var s = Math.floor((code - 1) / 13);
        var ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        var suits = ['♠','♥','♦','♣'];
        return ranks[r] + suits[s];
    }
    function historyHtml() {
        var css = "<style>.DH_Body{font-family:Arial,Helvetica,sans-serif;font-size:13px;background-color:#bdc1c9;width:100%;margin:0}" +
            ".DH_Table{font-family:verdana,arial,sans-serif;font-size:11px;color:#333;border:1px solid #787878;border-collapse:collapse;width:100%;margin:0 auto;text-align:center}" +
            ".DH_TableHeader{border:1px solid #787878;background-color:#a6a6a6;padding:.4%;text-align:center;font-weight:bold}" +
            ".DH_TableRow{border:1px solid #666;background-color:#b3b3b3}" +
            ".DH_TableTd{border:1px solid #666;background-color:#fff;text-align:center;vertical-align:top;line-height:1.4}</style>";
        var rows = getHist().map(function (r) {
            var col = r.net > 0 ? 'green' : (r.net < 0 ? 'red' : 'black');
            return "<tr class='DH_TableRow'>" +
                "<td class='DH_TableTd'>" + r.id + "</td>" +
                "<td class='DH_TableTd'>" + r.date + "</td>" +
                "<td class='DH_TableTd'>" + r.wager.toFixed(2) + "</td>" +
                "<td class='DH_TableTd'><span style='color:" + col + ";'>" + r.net.toFixed(2) + "</span></td>" +
                "<td class='DH_TableTd'>" + r.balStart.toFixed(2) + " / " + r.balEnd.toFixed(2) + "</td>" +
                "<td class='DH_TableTd'>" + r.desc + "</td></tr>";
        }).join('');
        if (!rows) rows = "<tr class='DH_TableRow'><td class='DH_TableTd' colspan='6'>No games played yet</td></tr>";
        return "<div class='DH_Body'>" + css +
            "<table class='DH_Table'><tr class='DH_TableRow'>" +
            "<th class='DH_TableHeader'>Game Id</th><th class='DH_TableHeader'>Date</th>" +
            "<th class='DH_TableHeader'>Wagered</th><th class='DH_TableHeader'>Result</th>" +
            "<th class='DH_TableHeader'>Start/End Balance</th><th class='DH_TableHeader'>Description</th>" +
            "</tr>" + rows + "</table></div>";
    }

    // ---- response builders (x=y&... strings the client parses) ----
    function kv(obj) {
        var parts = [], k;
        for (k in obj) if (obj.hasOwnProperty(k)) parts.push(k + '=' + obj[k]);
        return parts.join('&');
    }

    function initResponse() {
        return kv({
            road: 'T', blocknote: '', iserr: 0, availablebalance: '',
            comm: COMM.toFixed(2), messageids: '', sid: 1, tcounter: '',
            bal: getBal().toFixed(2), jackpot: '', tcountertype: '',
            maxb: MAXB.toFixed(2), minb: MINB.toFixed(2),
            stats: STATS.join(','), lastgameid: GAMEID, tiep: TIEP.toFixed(4)
        });
    }

    function heartbeatResponse() {
        return kv({
            errorcode: 0, errordetails: '', GameBalance: getBal().toFixed(2),
            availablebalance: '', jackpot: '', mysts: '', tcounter: '',
            messageids: '', blocknote: ''
        });
    }

    // Play one full punto-banco round and settle the given bets.
    function dealResponse(ply, bnk, tie) {
        var wager = ply + bnk + tie;
        var balStart = getBal();
        if (wager <= 0) return kv({ iserr: 1, errd: 'No%20bet%20placed' });
        if (wager > balStart) return kv({ iserr: 1, errd: 'Insufficient%20funds' });

        var shoe = makeShoe();
        var p = [shoe.pop(), shoe.pop()];
        var b = [shoe.pop(), shoe.pop()];
        var ppre = total(p), bpre = total(b);

        // third-card rules (standard punto banco tableau)
        if (ppre < 8 && bpre < 8) {                    // no natural
            var p3v = null;
            if (ppre <= 5) { p.push(shoe.pop()); p3v = bacValue(p[2]); }
            var bankerDraws;
            if (p3v === null) {
                bankerDraws = (bpre <= 5);             // player stood on 6/7
            } else if (bpre <= 2) {
                bankerDraws = true;
            } else if (bpre === 3) {
                bankerDraws = (p3v !== 8);
            } else if (bpre === 4) {
                bankerDraws = (p3v >= 2 && p3v <= 7);
            } else if (bpre === 5) {
                bankerDraws = (p3v >= 4 && p3v <= 7);
            } else if (bpre === 6) {
                bankerDraws = (p3v === 6 || p3v === 7);
            } else {
                bankerDraws = false;                   // banker 7 stands
            }
            if (bankerDraws) b.push(shoe.pop());
        }

        var ptot = total(p), btot = total(b);
        var net = 0, bankerNet = 0, winner;
        if (ptot > btot) {
            winner = 'Player';
            net = ply - bnk - tie;
            STATS[0]++;
        } else if (btot > ptot) {
            winner = 'Banker';
            bankerNet = bnk * (1 - COMM / 100);        // banker win pays 1:1 minus commission
            net = bankerNet - ply - tie;
            STATS[1]++;
        } else {
            winner = 'Tie';
            net = tie * TIEP;                          // player/banker bets push on tie
            STATS[2]++;
        }
        STATS[5]++;
        saveStats();

        setBal(balStart + net);
        var gid = nextGameId();

        var now = new Date();
        function p2(n) { return (n < 10 ? '0' : '') + n; }
        pushHist({
            id: gid,
            date: p2(now.getMonth() + 1) + '/' + p2(now.getDate()) + '/' + now.getFullYear() +
                  '<br>' + p2(now.getHours()) + ':' + p2(now.getMinutes()) + ':' + p2(now.getSeconds()),
            wager: wager, net: net, balStart: balStart, balEnd: getBal(),
            desc: winner + ' wins &mdash; Player ' + ptot + ' (' + p.map(cardName).join(' ') + ')' +
                  ', Banker ' + btot + ' (' + b.map(cardName).join(' ') + ')'
        });

        return kv({
            pc3: p[2] || '', pc1: p[0], blocknote: '', iserr: 0, availablebalance: '',
            ptot: ptot, btot: btot, ppre: ppre, lastgameid: gid, jackpot: '',
            tcounter: '', rslt: net.toFixed(2), bpre: bpre,
            bc1: b[0], bc2: b[1], bc3: b[2] || '', bal: getBal().toFixed(2),
            messageids: '', stats: STATS.join(','),
            rblock: winner.charAt(0), bankerrslt: bankerNet.toFixed(2), pc2: p[1]
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

        if (u.indexOf('init.aspx') >= 0)      return initResponse();
        if (u.indexOf('heartbeat.aspx') >= 0) return heartbeatResponse();
        if (u.indexOf('deal.aspx') >= 0) {
            return dealResponse(parseFloat(p.ply) || 0, parseFloat(p.bnk) || 0, parseFloat(p.tie) || 0);
        }
        if (u.indexOf('enter.aspx') >= 0 || u.indexOf('game.aspx') >= 0) {
            return kv({ GAMESESSION: 'offline', errcode: 0 });
        }
        return null; // not a game endpoint -> let real ajax handle (e.g. GetLangXml)
    }

    // ---- install the jQuery interceptor once jQuery exists ----
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
            var dfd = $.Deferred();
            setTimeout(function () {
                try { if (opts.success) opts.success(resp, 'success', { responseText: resp }); }
                catch (e) { if (window.console) console.error('mock success cb error', e); }
                if (opts.complete) opts.complete({ responseText: resp }, 'success');
                dfd.resolve(resp, 'success', { responseText: resp });
            }, 60);
            return dfd.promise();
        };
        if (window.console) console.log('%c[offline] mock baccarat server active', 'color:#28a745');
    }

    if (window.jQuery) install(window.jQuery);
    else {
        var tries = 0;
        var t = setInterval(function () {
            if (window.jQuery) { clearInterval(t); install(window.jQuery); }
            else if (++tries > 200) clearInterval(t);
        }, 10);
    }

    // ---- XHR interceptor: the History window uses raw XMLHttpRequest ----
    var realOpen = XMLHttpRequest.prototype.open;
    var realSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this._mockHistory = String(url).toLowerCase().indexOf('dynamichistory.aspx') >= 0;
        return realOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
        if (this._mockHistory) {
            var xhr = this;
            setTimeout(function () {
                Object.defineProperty(xhr, 'readyState',   { value: 4, configurable: true });
                Object.defineProperty(xhr, 'status',       { value: 200, configurable: true });
                Object.defineProperty(xhr, 'responseText', { value: historyHtml(), configurable: true });
                if (xhr.onreadystatechange) xhr.onreadystatechange();
                if (xhr.onload) xhr.onload();
            }, 60);
            return;
        }
        return realSend.apply(this, arguments);
    };
})();
