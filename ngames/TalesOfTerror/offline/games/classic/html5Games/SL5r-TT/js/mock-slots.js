/*
 * mock-slots.js  —  Offline server emulator for "Tales of Terror" (SL5r-TT).
 *
 * The slot is a thin client: Init.aspx returns the reel strips (reesa),
 * paylines (paths) and paytable (payt); every Spin.aspx returns the visible
 * symbols (reels), coins won (cow), winning lines (hits) and new balance.
 * This file intercepts jQuery $.ajax and answers those endpoints locally with
 * the EXACT reel strips / paylines / paytable captured from the real server,
 * so payouts match the original game 1:1 for base spins.
 *
 * Verified: the win engine reproduces cow+hits for all captured spins exactly.
 * Not emulated: free-spins bonus (scatter X) and expanding-wild feature — base
 * game only. Scatter combos simply don't pay in this offline build.
 */
(function () {
    'use strict';

    var BAL_KEY = 'tot_offline_balance';
    var START_BALANCE = 2000.00;

    // ---- exact data captured from the real Init.aspx ----
    var REESA = 'LFHGEBXKIJDCLAFHGEBWKIJLDCXFHGAEBKLIJFHGDCWKEBAXLIJFHGDCKEBLWAIJFHGXKDCLEBIJAFHGKWDCLXEBIJFHGKALDCIJWEBKFHGLXADCIJKEBFHGLWADCIJK,LJHAGBWKILJHFDECKAGBLIJWHXKLFDECIJAGBHKWLJIFDECKHXLAGBJIKWHLFDECJAGBKILHXWJFDECKILAGBHJKLIFDECWHXAGBKJLIHKFDECJWLAGBIKHXJLFDECIK,LJHGDWAKLIJEFKHGLBCIDJWAKLEFIHGJKLBCDWAIEFXLKJHGDILBCKJEFWAHGLIKJDEFLBCKHGIWAXJLKDEFIHGJLBCKWAILEFDJKHGLBCIJKWAEFXDLHGIKJLBCEFIK,LHIGEAWJKFLCDHIGEBAJKLFHIXCDGEWJKLBAHIFGCDLJKEHIXFABGLCDWJKEHIFLGAJKCDBHIXEFLGWJKACDHIELFBGJKHIXCDALFEWJKGBHILCDAFJKEGHIXLBCDFJK,LIKFDBHJAGLIKEFCDHJGLIKBFWEHJCDAGLIKFBHJEXLIKGDCFWHJLIKEAGBDFCHJLIKGEFWDHJBXLIKCAGEFHJDLIKGCBHJFWELIKDAGHJFCLIKBEXGDHJFWLIKCEGHJ';
    var PATHS = '22222,11111,33333,12321,32123,11211,33233,21112,23332,11233,33211,21232,23212,12121,32323,12221,32223,21212,23232,22122,22322,13331,31113,13131,31313';
    var PAYT  = '3A:100,4A:500,5A:2000,3B:75,4B:250,5B:1500,3C:50,4C:225,5C:1250,3D:40,4D:200,5D:1000,3E:30,4E:100,5E:750,3F:20,4F:75,5F:500,3G:15,4G:65,5G:250,3H:10,4H:55,5H:150,3I:7,4I:45,5I:100,3J:5,4J:35,5J:75,3K:5,4K:25,5K:50,3L:5,4L:15,5L:25,3W:100,4W:500,5W:2000,3X:FS10,4X:FS15,5X:FS25';

    // Init.aspx response template (verbatim from server); %BAL% is swapped in.
    var INIT_TEMPLATE = 'incoins=0&availablebalance=&minb=0.01&tcounter=&bal=%BAL%&cvals=0.01%2C0.05%2C0.10%2C0.25%2C0.50%2C1.00&gid=&blocknote=&mysts=&cvalsd=1%C2%A2%2C5%C2%A2%2C10%C2%A2%2C25%C2%A2%2C50%C2%A2%2C%241&brvars=&reels=&afeat=0&messageids=&cuvars=&brpayt=&maxb=25.00&lb=25&lc=1&reesa=' + REESA + '&tcountertype=&frees=0&brclid=&jackpot=&fsmult=&iserr=0&maxlc=1&maxlb=25&payt=' + PAYT + '&paths=' + PATHS + '&brplog=&lastgameid=%GID%&brlevs=&minlb=1&brmult=&twks=&cv=0.05&allsym=JHGECKILWFDXBA';

    var strips = REESA.split(',');                 // 5 reel strips
    var paths  = PATHS.split(',');                 // 25 paylines
    var payt   = {};
    PAYT.split(',').forEach(function (e) { var p = e.split(':'); payt[p[0]] = p[1]; });

    var GID = 611200000;

    function getBal() {
        var b = parseFloat(localStorage.getItem(BAL_KEY));
        if (isNaN(b)) { b = START_BALANCE; setBal(b); }
        return b;
    }
    function setBal(b) { localStorage.setItem(BAL_KEY, (Math.round(b * 100) / 100).toFixed(2)); }
    function rnd(n) { return Math.floor(Math.random() * n); }

    // spin one reel: random stop, return 3 consecutive symbols (top,mid,bottom)
    function spinReel(strip) {
        var L = strip.length, s = rnd(L);
        return strip[s] + strip[(s + 1) % L] + strip[(s + 2) % L];
    }

    // evaluate wins for a 5x3 grid — VERIFIED identical to the real server.
    function evaluate(reels) {
        var total = 0, hits = [];
        for (var li = 0; li < paths.length; li++) {
            var path = paths[li];
            // symbol on each reel at this line's row
            var syms = [];
            for (var r = 0; r < 5; r++) syms.push(reels[r].charAt(parseInt(path.charAt(r), 10) - 1));
            // paying symbol = first non-wild; wild (W) substitutes; scatter (X) doesn't pay on lines
            var base = null;
            for (var k = 0; k < 5; k++) { if (syms[k] !== 'W') { base = syms[k]; break; } }
            if (base === null) base = 'W';
            if (base === 'X') continue;
            // count consecutive matches from the left
            var cnt = 0;
            for (var m = 0; m < 5; m++) { if (syms[m] === base || syms[m] === 'W') cnt++; else break; }
            if (cnt >= 3) {
                var key = cnt + base;
                if (payt[key] && payt[key].indexOf('FS') !== 0) {
                    var coins = parseInt(payt[key], 10);
                    total += coins;
                    var partPath = path.substring(0, Math.min(cnt + 1, 5));
                    hits.push(partPath + '.' + cnt + base + '.' + coins);
                }
            }
        }
        return { cow: total, hits: hits };
    }

    function initResponse() {
        return INIT_TEMPLATE
            .replace('%BAL%', getBal().toFixed(2))
            .replace('%GID%', (++GID));
    }

    function heartbeatResponse() {
        return 'errorcode=0&errordetails=&GameBalance=' + getBal().toFixed(2) +
               '&availablebalance=&jackpot=&mysts=&tcounter=&messageids=&blocknote=';
    }

    function spinResponse(p) {
        var lb = parseInt(p.lb, 10) || 25;
        var lc = parseInt(p.lc, 10) || 1;
        var cv = parseFloat(p.cv) || 0.05;
        var bet = lb * lc * cv;

        setBal(getBal() - bet);                    // take stake

        // only the first `lb` lines are active
        var activePaths = paths.slice(0, lb);
        var reels = [];
        for (var r = 0; r < 5; r++) reels.push(spinReel(strips[r]));

        // evaluate against active lines only
        var savedPaths = paths;
        paths = activePaths;
        var res = evaluate(reels);
        paths = savedPaths;

        var win = res.cow * cv;
        if (win > 0) setBal(getBal() + win);

        var gid = (++GID);
        return 'mult=&blocknote=&messageids=&iserr=0&brvars=&reels=|' + reels.join('|') +
               '|&brclid=&cow=' + res.cow + '&tcounter=&gid=' + gid +
               '&frees=0&morls=&availablebalance=&afeat=0&fsmult=&cuvars=&bal=' + getBal().toFixed(2) +
               '&reesa=&jackpot=&lastgameid=' + gid + '&mysts=&hits=' + res.hits.join(',') +
               '&brpayt=&brmult=';
    }

    function parseBody(data) {
        var o = {};
        if (!data) return o;
        String(data).split('&').forEach(function (kv) {
            var i = kv.indexOf('=');
            if (i < 0) { o[kv] = ''; return; }
            o[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
        });
        return o;
    }

    function handle(url, body) {
        var u = String(url).toLowerCase();
        var p = parseBody(body);
        if (u.indexOf('init.aspx') >= 0)      return initResponse();
        if (u.indexOf('spin.aspx') >= 0)      return spinResponse(p);
        if (u.indexOf('heartbeat.aspx') >= 0) return heartbeatResponse();
        if (u.indexOf('enter.aspx') >= 0 || u.indexOf('game.aspx') >= 0)
            return 'GAMESESSION=offline&errcode=0';
        return null; // pass through (e.g. GetLangXml, LoaderConfig static files)
    }

    function install($) {
        var realAjax = $.ajax;
        $.ajax = function (a, b) {
            var opts = (typeof a === 'object') ? a : (b || {});
            if (typeof a === 'string') opts.url = a;
            var resp = null;
            try { resp = handle(opts.url, opts.data); } catch (e) {
                if (window.console) console.error('mock-slots error', e);
            }
            if (resp === null) return realAjax.apply(this, arguments);
            var dfd = $.Deferred();
            setTimeout(function () {
                try { if (opts.success) opts.success(resp, 'success', { responseText: resp }); }
                catch (e) { if (window.console) console.error('mock-slots success cb error', e); }
                if (opts.complete) opts.complete({ responseText: resp }, 'success');
                dfd.resolve(resp, 'success', { responseText: resp });
            }, 60);
            return dfd.promise();
        };
        if (window.console) console.log('%c[offline] Tales of Terror mock server active', 'color:#c0392b');
    }

    if (window.jQuery) install(window.jQuery);
    else {
        var tries = 0, t = setInterval(function () {
            if (window.jQuery) { clearInterval(t); install(window.jQuery); }
            else if (++tries > 200) clearInterval(t);
        }, 10);
    }
})();
