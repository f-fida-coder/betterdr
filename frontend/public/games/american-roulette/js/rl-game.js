/*
 * rl-game.js — American Roulette client (platform build).
 *
 * Rendering + input only. The winning pocket, net result and balance come
 * exclusively from the server via window.Server (site_bridge.js -> parent
 * postMessage -> platform API): this file animates to the server's
 * spin=<token> and displays the server's bal/rslt. It contains NO outcome
 * RNG, NO payout math beyond displaying server figures, and NO persisted
 * balance. Math.random below is used ONLY for spin-animation flourish
 * (extra wheel rotation / ball laps) — the pocket it settles on is the
 * server's token, always.
 *
 * Table geometry was measured from images/numbers-table.png (1024x552):
 *   number grid   x 80..921  (12 columns), y 55.5..341 (3 rows)
 *   zero column   x 0..80, split between 00/0 at y 198.25
 *   2-to-1 column x 921..1020
 *   dozens row    y 341..415.5,  outside row y 415.5..501
 * Wheel (images/roulette-wheel.png): American order clockwise from the green
 * 0 pocket, whose centre sits at -1.0deg (just above 3 o'clock) at rotation 0.
 */
(function () {
    'use strict';

    // ------------------------------------------------------------------ config
    var STAGE_W = 1360, STAGE_H = 765;

    // table geometry (image space, 1024x552)
    var IMG_W = 1024, IMG_H = 552;
    var X0 = 80, XW = 70.125, XR = 921;        // grid left, col width, grid right
    var Y0 = 55.5, YH = 95.17, Y3 = 341;       // grid top, row height, grid bottom
    var ZERO_SPLIT_Y = 198.25;
    var COL_R = 1020;                          // right edge of 2to1 cells
    var DOZ_Y = 415.5, OUT_Y = 501;
    var OUT_X = [80, 220.5, 361, 501, 641, 781, 921];
    var TOL = 13;

    // wheel
    var ORDER = ['0','28','9','26','30','11','7','20','32','17','5','22','34',
                 '15','3','24','36','13','1','00','27','10','25','29','12','8',
                 '19','31','18','6','21','33','16','4','23','35','14','2'];
    var STEP = 360 / 38;
    var OFF0 = -1.0;                           // pocket '0' centre at rotation 0
    var WHEEL_SIZE = 370;
    var BALL_R_OUT = 0.470 * WHEEL_SIZE;
    var BALL_R_IN  = 0.360 * WHEEL_SIZE;

    var RED = {};
    [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].forEach(function (n) { RED[n] = 1; });

    var CHIPS = [
        { value: 1,   color: 'Gray'   },
        { value: 5,   color: 'Red'    },
        { value: 25,  color: 'Green'  },
        { value: 100, color: 'Blue'   },
        { value: 500, color: 'Violet' }
    ];

    // Per-position maximums, replaced at Init with the server's clamped
    // payoutConfig values (max_su/max_sp/… fields) so the caps the table
    // enforces at chip placement are the SAME caps the server enforces at
    // bet time. These literals are only the pre-Init fallback and equal the
    // server spec defaults. fiveBetEnabled mirrors the admin toggle: when
    // off, the ff zone is not offered (and the server rejects it regardless).
    var MAXPOS = { su: 25, sp: 50, st: 75, tz: 75, cn: 100, ff: 125, sx: 150,
                   dz: 100, cl: 100, lo: 100, hi: 100, ev: 100, od: 100, rd: 100, bk: 100 };
    var fiveBetEnabled = true;

    function applyServerLimits(r) {
        function cap(field, keys) {
            var n = parseInt(r[field], 10);
            if (!isFinite(n) || n <= 0) return;
            keys.forEach(function (k) { MAXPOS[k] = n; });
        }
        cap('MAX_SU', ['su']);
        cap('MAX_SP', ['sp']);
        cap('MAX_ST', ['st']);
        cap('MAX_TZ', ['tz']);
        cap('MAX_CN', ['cn']);
        cap('MAX_FF', ['ff']);
        cap('MAX_SX', ['sx']);
        cap('MAX_OUT', ['dz', 'cl', 'lo', 'hi', 'ev', 'od', 'rd', 'bk']);
        if (r.FIVEBET != null) {
            fiveBetEnabled = String(r.FIVEBET) !== '0';
            var payRow = document.getElementById('pay-five-bet');
            if (payRow) payRow.style.display = fiveBetEnabled ? '' : 'none';
            if (!fiveBetEnabled) {
                // Drop any ff chip that predates the toggle (pre-Init rebet).
                placements = placements.filter(function (p) { return p.code !== 'ff'; });
            }
        }
    }

    // ------------------------------------------------------------------ state
    var balance = 0, minb = 1, maxb = 5000, lastGameId = 0;
    var placements = [];        // [{code, amt, x, y}] every chip drop, in order
    var lastBets = [];          // copy of previous round's placements, for REBET
    var selectedChip = 1;       // index into CHIPS
    var spinning = false;
    var soundOn = true;
    var fastPlay = false;
    var wheelAngle = 0, ballAngle = 90, ballParked = false;
    var history = [];           // session-only; the platform owns real history

    // ------------------------------------------------------------------ dom
    function $(id) { return document.getElementById(id); }
    var elStage, elWheel, elBall, elBadge, elAnnounce, elChipsLayer, elHighlight;

    // ------------------------------------------------------------------ sounds
    var sounds = {};
    function loadSound(name, file) { sounds[name] = new Audio('sounds/' + file); }
    function play(name) {
        if (!soundOn || !sounds[name]) return null;
        var a = sounds[name];
        try { a.currentTime = 0; a.play(); } catch (e) {}
        return a;
    }
    function stopSound(name) {
        var a = sounds[name];
        if (a) { try { a.pause(); a.currentTime = 0; } catch (e) {} }
    }

    // ------------------------------------------------------------------ utils
    function fmt(v) { return '$' + (Math.round(v * 100) / 100).toFixed(2); }
    function colorOf(tok) {
        if (tok === '0' || tok === '00') return 'green';
        return RED[parseInt(tok, 10)] ? 'red' : 'black';
    }
    function stakedTotal() {
        var t = 0;
        placements.forEach(function (p) { t += p.amt; });
        return Math.round(t * 100) / 100;
    }
    function betTypeOf(code) {
        if (code === 'tz' || code === 'ff') return code;
        var m = code.match(/^(su|sp|st|cn|sx|dz|cl|lo|hi|ev|od|rd|bk)/);
        return m ? m[1] : null;
    }
    function totalOnCode(code) {
        var t = 0;
        placements.forEach(function (p) { if (p.code === code) t += p.amt; });
        return Math.round(t * 100) / 100;
    }

    // ------------------------------------------------------------------ hit test
    // (ix,iy) in numbers-table image coordinates -> {code, x, y} or null
    function hitTest(ix, iy) {
        var inGridY = iy > Y0 - TOL && iy < Y3 + TOL;

        // --- zero column ---
        if (ix < X0 - TOL) {
            if (iy < Y0 - TOL || iy > Y3 + TOL || ix < 6) return null;
            if (Math.abs(iy - ZERO_SPLIT_Y) <= TOL)
                return { code: 'sp0_00', x: 42, y: ZERO_SPLIT_Y };
            if (iy < ZERO_SPLIT_Y) return { code: 'su00', x: 40, y: 127 };
            return { code: 'su0', x: 40, y: 270 };
        }

        // --- boundary between zeros and first column ---
        if (Math.abs(ix - X0) <= TOL && inGridY) {
            if (Math.abs(iy - Y3) <= TOL || Math.abs(iy - Y0) <= TOL) {
                if (!fiveBetEnabled) return null;   // admin toggle: not offered
                return { code: 'ff', x: X0, y: Math.abs(iy - Y3) <= TOL ? Y3 : Y0 };
            }
            var zr = Math.min(2, Math.max(0, Math.floor((iy - Y0) / YH)));
            if (zr === 0) return { code: 'sp00_3', x: X0, y: Y0 + 0.5 * YH };
            if (zr === 1) return { code: 'tz',     x: X0, y: Y0 + 1.5 * YH };
            return { code: 'sp0_1', x: X0, y: Y0 + 2.5 * YH };
        }

        // --- 2 to 1 column bets ---
        if (ix > XR + TOL && ix < COL_R + 6 && inGridY) {
            var cr = Math.min(2, Math.max(0, Math.floor((iy - Y0) / YH)));
            var code = ['cl3', 'cl2', 'cl1'][cr];
            return { code: code, x: (XR + COL_R) / 2, y: Y0 + (cr + 0.5) * YH };
        }

        // --- number grid (incl. its top/bottom edge lines) ---
        if (ix >= X0 - TOL && ix <= XR + TOL && inGridY) {
            var fi  = (ix - X0) / XW;
            var col = Math.min(11, Math.max(0, Math.floor(fi)));
            var vb  = Math.round(fi);                       // nearest vertical line 0..12
            var nearV = vb >= 1 && vb <= 11 && Math.abs(ix - (X0 + vb * XW)) <= TOL;
            var fr  = (iy - Y0) / YH;
            var row = Math.min(2, Math.max(0, Math.floor(fr)));
            var hb  = Math.round(fr);                       // nearest horizontal line 0..3
            var nearH = hb >= 0 && hb <= 3 && Math.abs(iy - (Y0 + hb * YH)) <= TOL;

            var numAt = function (c, r) { return 3 * c + 3 - r; };

            if (nearH && (hb === 0 || hb === 3)) {          // top/bottom edge
                var ey = Y0 + hb * YH;
                if (nearV) return { code: 'sx' + vb, x: X0 + vb * XW, y: ey };
                return { code: 'st' + (col + 1), x: X0 + (col + 0.5) * XW, y: ey };
            }
            if (nearH && nearV) {                           // inner corner
                var n = 3 * vb - hb;
                return { code: 'cn' + n, x: X0 + vb * XW, y: Y0 + hb * YH };
            }
            if (nearH) {                                    // vertical split n / n+1
                var lo = numAt(col, hb);                    // row hb is the lower number
                return { code: 'sp' + lo + '_' + (lo + 1),
                         x: X0 + (col + 0.5) * XW, y: Y0 + hb * YH };
            }
            if (nearV) {                                    // horizontal split n / n+3
                var l2 = numAt(vb - 1, row);
                return { code: 'sp' + l2 + '_' + (l2 + 3),
                         x: X0 + vb * XW, y: Y0 + (row + 0.5) * YH };
            }
            return { code: 'su' + numAt(col, row),
                     x: X0 + (col + 0.5) * XW, y: Y0 + (row + 0.5) * YH };
        }

        // --- dozens ---
        if (iy > Y3 + TOL && iy < DOZ_Y && ix > X0 && ix < XR) {
            var dz = ix < 361 ? 1 : ix < 641 ? 2 : 3;
            var dcx = [220.5, 501, 781][dz - 1];
            return { code: 'dz' + dz, x: dcx, y: (Y3 + DOZ_Y) / 2 };
        }

        // --- outside row ---
        if (iy >= DOZ_Y && iy < OUT_Y + 6 && ix > X0 && ix < XR) {
            var codes = ['lo', 'ev', 'rd', 'bk', 'od', 'hi'];
            for (var s = 0; s < 6; s++) {
                if (ix >= OUT_X[s] && ix < OUT_X[s + 1]) {
                    return { code: codes[s],
                             x: (OUT_X[s] + OUT_X[s + 1]) / 2, y: (DOZ_Y + OUT_Y) / 2 };
                }
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ chips on table
    function chipColorFor(total) {
        var c = CHIPS[0].color;
        for (var i = 0; i < CHIPS.length; i++)
            if (total >= CHIPS[i].value) c = CHIPS[i].color;
        return c;
    }

    function redrawChips() {
        elChipsLayer.innerHTML = '';
        var scale = 860 / IMG_W;
        var byCode = {};
        placements.forEach(function (p) {
            if (!byCode[p.code]) byCode[p.code] = { amt: 0, x: p.x, y: p.y };
            byCode[p.code].amt += p.amt;
        });
        Object.keys(byCode).forEach(function (code) {
            var b = byCode[code];
            var amt = Math.round(b.amt * 100) / 100;
            var d = document.createElement('div');
            d.className = 'table-chip';
            d.style.left = (b.x * scale) + 'px';
            d.style.top  = (b.y * scale) + 'px';
            var img = document.createElement('img');
            img.src = 'images/chips/Chip-' + chipColorFor(amt) + '-Table.png';
            d.appendChild(img);
            var t = document.createElement('div');
            t.className = 'amt';
            t.textContent = amt >= 1000 ? (amt / 1000) + 'k' : String(amt);
            d.appendChild(t);
            elChipsLayer.appendChild(d);
        });
        $('ro-bet').textContent = fmt(stakedTotal());
        $('ro-balance').textContent = fmt(balance - stakedTotal());
    }

    function placeChip(hit) {
        if (spinning) return;
        var denom = CHIPS[selectedChip].value;
        var type = betTypeOf(hit.code);
        var maxPos = MAXPOS[type] || maxb;
        if (totalOnCode(hit.code) + denom > maxPos) {
            announce('MAX ' + fmt(maxPos) + ' ON THIS SPOT', 1600);
            return;
        }
        if (stakedTotal() + denom > balance) {
            announce('NOT ENOUGH CREDITS', 1600);
            play('lowCredits');
            return;
        }
        placements.push({ code: hit.code, amt: denom, x: hit.x, y: hit.y });
        play('click');
        redrawChips();
    }

    function removeChip(hit) {
        if (spinning || !hit) return;
        for (var i = placements.length - 1; i >= 0; i--) {
            if (placements[i].code === hit.code) {
                placements.splice(i, 1);
                play('click');
                redrawChips();
                return;
            }
        }
    }

    // ------------------------------------------------------------------ announce
    var announceTimer = null;
    function announce(msg, ms) {
        elAnnounce.textContent = msg;
        if (announceTimer) { clearTimeout(announceTimer); announceTimer = null; }
        if (ms) {
            announceTimer = setTimeout(function () {
                elAnnounce.textContent = spinning ? '' : 'PLACE YOUR BETS';
            }, ms);
        }
    }

    // ------------------------------------------------------------------ history
    function redrawHistory() {
        var box = $('history-nums');
        box.innerHTML = '';
        history.slice(0, 14).forEach(function (tok, i) {
            var d = document.createElement('div');
            d.className = 'hist-num ' + colorOf(tok) + (i === 0 ? ' latest' : '');
            d.textContent = tok;
            box.appendChild(d);
        });
    }
    function pushHistory(tok) {
        history.unshift(tok);
        history = history.slice(0, 30);
        redrawHistory();
    }

    // ------------------------------------------------------------------ wheel animation
    function setWheel(a) { elWheel.style.transform = 'rotate(' + a + 'deg)'; }
    function setBall(angleDeg, radius) {
        var cx = WHEEL_SIZE / 2, cy = WHEEL_SIZE / 2;
        var r = angleDeg * Math.PI / 180;
        elBall.style.left = (cx + radius * Math.cos(r) - 7.5) + 'px';
        elBall.style.top  = (cy + radius * Math.sin(r) - 7.5) + 'px';
    }

    function animateSpin(winTok, done) {
        var idx = ORDER.indexOf(winTok);
        if (idx < 0) idx = 0;
        var D = fastPlay ? 2800 : 7000;
        var W0 = wheelAngle % 360;
        // Animation flourish only: how many extra degrees the wheel turns
        // before parking on the server's pocket. Never affects the outcome.
        var Wf = W0 + (fastPlay ? 720 : 1080) + Math.random() * 360;
        var pocketAng = OFF0 + idx * STEP;
        // ball's final screen angle must line up with the pocket on the stopped wheel
        var Af = Wf + pocketAng;
        var A0 = ballAngle % 360;
        var fwd = ((Af - A0) % 360 + 360) % 360;
        var dA = fwd - 360 * (fastPlay ? 3 : 6);   // several backward laps, then settle
        var t0 = null;
        var bounced = false;

        elBall.style.display = 'block';
        var loop = play('loop');

        function frame(ts) {
            if (t0 === null) t0 = ts;
            var t = Math.min(1, (ts - t0) / D);
            var e = 1 - Math.pow(1 - t, 3);          // easeOutCubic
            var W = W0 + (Wf - W0) * e;
            var A = A0 + dA * e;
            // ball drops from the rim into the pockets over the last 40%
            var dropP = Math.max(0, Math.min(1, (t - 0.60) / 0.34));
            var dp = dropP * dropP * (3 - 2 * dropP);   // smoothstep
            var R = BALL_R_OUT + (BALL_R_IN - BALL_R_OUT) * dp;
            if (dropP > 0 && dropP < 1)
                R += Math.sin(dropP * Math.PI * 5) * 5 * (1 - dropP);   // rattle
            if (!bounced && t > 0.66) { bounced = true; play('ballBounce'); }
            setWheel(W);
            setBall(A, R);
            if (t < 1) { requestAnimationFrame(frame); return; }
            wheelAngle = Wf;
            ballAngle = Af;
            ballParked = true;
            if (loop) stopSound('loop');
            play('ballStop');
            done();
        }
        requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------------ server calls
    function parseKv(data) {
        var o = {};
        String(data).split('&').forEach(function (p) {
            var i = p.indexOf('=');
            if (i >= 0) o[p.slice(0, i).toUpperCase()] = p.slice(i + 1);
        });
        return o;
    }

    function doInit() {
        window.Server.post('roulette/Init.aspx', 'lastgameid=0', function (data) {
            var r = parseKv(data);
            if (r.ISERR && r.ISERR !== '0') {
                announce(decodeURIComponent(r.ERRD || 'CONNECTION ERROR'), 0);
                return;
            }
            balance = parseFloat(r.BAL) || 0;
            minb = parseFloat(r.MINB) || 1;
            maxb = parseFloat(r.MAXB) || 5000;
            lastGameId = r.LASTGAMEID || 0;
            applyServerLimits(r);
            $('limits').innerHTML = 'MIN ' + fmt(minb) + ' &nbsp;•&nbsp; MAX ' + fmt(maxb);
            redrawChips();
            announce('PLACE YOUR BETS');
        }, function () {
            announce('CONNECTION ERROR', 0);
        });
    }

    function doSpin() {
        if (spinning) return;
        var total = stakedTotal();
        if (total < minb) { announce('PLACE YOUR BETS FIRST', 1600); return; }

        // aggregate placements into protocol fields:  &su8=1.00&dz3=5.00...
        var byCode = {};
        placements.forEach(function (p) { byCode[p.code] = (byCode[p.code] || 0) + p.amt; });
        var bets = '';
        Object.keys(byCode).forEach(function (c) { bets += '&' + c + '=' + byCode[c].toFixed(2); });

        spinning = true;
        setButtons();
        announce('NO MORE BETS');
        play('click');

        var params = 'lastgameid=' + lastGameId + bets;
        window.Server.post('roulette/Spin.aspx', params, function (data) {
            var r = parseKv(data);
            if (r.ISERR && r.ISERR !== '0') {
                spinning = false;
                setButtons();
                announce(decodeURIComponent(r.ERRD || 'ERROR'), 2500);
                return;
            }
            lastGameId = r.LASTGAMEID || lastGameId;
            var winTok = r.SPIN;
            var newBal = parseFloat(r.BAL);
            var rslt = parseFloat(r.RSLT) || 0;
            var winAmount = Math.max(0, rslt + total);   // stake back + profit

            animateSpin(winTok, function () {
                balance = newBal;
                lastBets = placements.slice();
                placements = [];
                spinning = false;

                pushHistory(winTok);
                showWinBadge(winTok);

                var color = colorOf(winTok);
                var msg = winTok + ' ' + color.toUpperCase();
                if (winAmount > 0) {
                    msg += ' — YOU WIN ' + fmt(winAmount);
                    play('win');
                    var ro = $('ro-win');
                    ro.classList.add('flash');
                    setTimeout(function () { ro.classList.remove('flash'); }, 2500);
                }
                $('ro-win').textContent = fmt(winAmount);
                announce(msg, 4000);
                announceNumber(winTok);
                redrawChips();
                setButtons();
                if (balance < minb) { play('lowCredits'); announce('OUT OF CREDITS', 0); }

                // Reveal done: the parent applies its held balance/result now.
                if (window.SiteBridge && window.SiteBridge.spinComplete) {
                    window.SiteBridge.spinComplete();
                }
            });
        }, function (err) {
            spinning = false;
            setButtons();
            announce('SERVER ERROR', 2000);
        });
    }

    function announceNumber(tok) {
        if (!soundOn) return;
        var numSnd = new Audio('sounds/Numbers/' + tok + '.mp3');
        try { numSnd.play(); } catch (e) {}
        if (tok !== '0' && tok !== '00') {
            var color = colorOf(tok);
            numSnd.addEventListener('ended', function () {
                var c = new Audio('sounds/Numbers/' + color + '.mp3');
                try { c.play(); } catch (e) {}
            });
        }
    }

    function showWinBadge(tok) {
        elBadge.className = colorOf(tok);
        elBadge.textContent = tok;
        elBadge.style.display = 'flex';
    }

    // ------------------------------------------------------------------ buttons
    function setButtons() {
        var dis = spinning;
        ['btn-spin', 'btn-clear', 'btn-undo', 'btn-rebet'].forEach(function (id) {
            $(id).classList.toggle('disabled', dis);
        });
        if (!spinning) {
            $('btn-rebet').classList.toggle('disabled', lastBets.length === 0);
            $('btn-undo').classList.toggle('disabled', placements.length === 0);
            $('btn-clear').classList.toggle('disabled', placements.length === 0);
        }
    }

    // ------------------------------------------------------------------ init UI
    function buildChipTray() {
        var tray = $('chip-tray');
        CHIPS.forEach(function (c, i) {
            var d = document.createElement('div');
            d.className = 'tray-chip' + (i === selectedChip ? ' selected' : '');
            var img = document.createElement('img');
            img.src = 'images/chips/Chip-' + c.color + '.png';
            d.appendChild(img);
            var t = document.createElement('div');
            t.className = 'amt';
            t.textContent = c.value >= 1000 ? (c.value / 1000) + 'k' : String(c.value);
            d.appendChild(t);
            d.addEventListener('click', function () {
                selectedChip = i;
                play('click');
                var all = tray.querySelectorAll('.tray-chip');
                for (var k = 0; k < all.length; k++) all[k].classList.remove('selected');
                d.classList.add('selected');
            });
            tray.appendChild(d);
        });
    }

    function tableEventCoords(clientX, clientY) {
        var rect = $('table-img').getBoundingClientRect();
        var ix = (clientX - rect.left) / rect.width * IMG_W;
        var iy = (clientY - rect.top) / rect.height * IMG_H;
        return { ix: ix, iy: iy };
    }

    // Table input. Pointer events cover mouse, touch and pen with one path:
    // a short tap/click places the selected chip; a long-press (touch) or
    // right-click (mouse) removes the top chip on that spot; the highlight
    // follows mouse hover only. Falls back to plain click on old browsers.
    function bindTable() {
        var img = $('table-img');
        var TAP_MS = 450, MOVE_PX = 12;

        function placeAt(clientX, clientY) {
            var c = tableEventCoords(clientX, clientY);
            var hit = hitTest(c.ix, c.iy);
            if (hit) placeChip(hit);
        }
        function removeAt(clientX, clientY) {
            var c = tableEventCoords(clientX, clientY);
            removeChip(hitTest(c.ix, c.iy));
        }

        img.addEventListener('contextmenu', function (ev) {
            ev.preventDefault();
            if (ev.pointerType !== 'touch') removeAt(ev.clientX, ev.clientY);
        });

        if (window.PointerEvent) {
            var press = null;   // {id, x, y, timer, longFired}

            img.addEventListener('pointerdown', function (ev) {
                if (!ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
                var state = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, timer: null, longFired: false };
                press = state;
                if (ev.pointerType !== 'mouse') {
                    // long-press = remove (the touch stand-in for right-click)
                    state.timer = setTimeout(function () {
                        if (press !== state) return;
                        state.longFired = true;
                        removeAt(state.x, state.y);
                    }, TAP_MS);
                }
            });

            img.addEventListener('pointermove', function (ev) {
                if (press && ev.pointerId === press.id) {
                    if (Math.abs(ev.clientX - press.x) > MOVE_PX || Math.abs(ev.clientY - press.y) > MOVE_PX) {
                        if (press.timer) clearTimeout(press.timer);
                        press = null;   // treat as a drag/scroll, not a tap
                    }
                }
                if (ev.pointerType === 'mouse') {
                    var c = tableEventCoords(ev.clientX, ev.clientY);
                    var hit = hitTest(c.ix, c.iy);
                    if (!hit || spinning) { elHighlight.style.display = 'none'; return; }
                    var scale = 860 / IMG_W;
                    elHighlight.style.display = 'block';
                    elHighlight.style.width = '30px';
                    elHighlight.style.height = '30px';
                    elHighlight.style.left = (hit.x * scale - 15) + 'px';
                    elHighlight.style.top  = (hit.y * scale - 15) + 'px';
                }
            });

            img.addEventListener('pointerup', function (ev) {
                if (!press || ev.pointerId !== press.id) return;
                var state = press;
                press = null;
                if (state.timer) clearTimeout(state.timer);
                if (!state.longFired) placeAt(ev.clientX, ev.clientY);
            });

            img.addEventListener('pointercancel', function () {
                if (press && press.timer) clearTimeout(press.timer);
                press = null;
            });

            // pointerup already placed the chip — swallow the synthetic click.
            img.addEventListener('click', function (ev) { ev.preventDefault(); });
        } else {
            img.addEventListener('click', function (ev) { placeAt(ev.clientX, ev.clientY); });
            img.addEventListener('mousemove', function (ev) {
                var c = tableEventCoords(ev.clientX, ev.clientY);
                var hit = hitTest(c.ix, c.iy);
                if (!hit || spinning) { elHighlight.style.display = 'none'; return; }
                var scale = 860 / IMG_W;
                elHighlight.style.display = 'block';
                elHighlight.style.width = '30px';
                elHighlight.style.height = '30px';
                elHighlight.style.left = (hit.x * scale - 15) + 'px';
                elHighlight.style.top  = (hit.y * scale - 15) + 'px';
            });
        }

        img.addEventListener('mouseleave', function () {
            elHighlight.style.display = 'none';
        });
    }

    function bindButtons() {
        $('btn-spin').addEventListener('click', doSpin);
        $('btn-clear').addEventListener('click', function () {
            if (spinning || !placements.length) return;
            placements = [];
            play('click');
            redrawChips();
            setButtons();
        });
        $('btn-undo').addEventListener('click', function () {
            if (spinning || !placements.length) return;
            placements.pop();
            play('click');
            redrawChips();
            setButtons();
        });
        $('btn-rebet').addEventListener('click', function () {
            if (spinning || !lastBets.length) return;
            var t = 0;
            lastBets.forEach(function (p) { t += p.amt; });
            if (t > balance) { announce('NOT ENOUGH CREDITS', 1600); play('lowCredits'); return; }
            placements = lastBets.map(function (p) {
                return { code: p.code, amt: p.amt, x: p.x, y: p.y };
            });
            play('click');
            redrawChips();
            setButtons();
        });
        $('btn-sound').addEventListener('click', function () {
            soundOn = !soundOn;
            this.src = 'common/img/buttons/sounds-' + (soundOn ? 'on' : 'off') + '.png';
        });
        $('btn-speed').addEventListener('click', function () {
            fastPlay = !fastPlay;
            this.src = 'common/img/buttons/' + (fastPlay ? 'normal-play' : 'fast-play') + '.png';
            announce(fastPlay ? 'FAST PLAY' : 'NORMAL PLAY', 1200);
        });
        $('btn-info').addEventListener('click', function () {
            var d = $('info-dialog');
            d.style.display = d.style.display === 'block' ? 'none' : 'block';
        });
        $('info-close').addEventListener('click', function () {
            $('info-dialog').style.display = 'none';
        });
    }

    function fitStage() {
        var s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
        elStage.style.left = ((window.innerWidth - STAGE_W * s) / 2) + 'px';
        elStage.style.top  = ((window.innerHeight - STAGE_H * s) / 2) + 'px';
        elStage.style.transform = 'scale(' + s + ')';
    }

    function heartbeat() {
        window.Server.post('Chiptransfer/Heartbeat.aspx', '', function (data) {
            var r = parseKv(data);
            if (!spinning && r.GAMEBALANCE) {
                balance = parseFloat(r.GAMEBALANCE) || balance;
                redrawChips();
            }
        });
    }

    // ------------------------------------------------------------------ boot
    function boot() {
        elStage = $('stage');
        elWheel = $('wheel');
        elBall = $('ball');
        elBadge = $('win-badge');
        elAnnounce = $('announce');
        elChipsLayer = $('chips-layer');
        elHighlight = $('spot-highlight');

        loadSound('click',      'ButtonClick.mp3');
        loadSound('loop',       'loop_final.mp3');
        loadSound('ballBounce', 'ball-bounce.mp3');
        loadSound('ballStop',   'ballstop.mp3');
        loadSound('win',        'win1.mp3');
        loadSound('lowCredits', 'LowCredits.mp3');
        loadSound('counting',   'Counting.mp3');

        buildChipTray();
        bindTable();
        bindButtons();
        redrawHistory();
        setButtons();

        window.addEventListener('resize', fitStage);
        fitStage();

        doInit();
        setInterval(heartbeat, 30000);
    }

    // test hook (used by the offline build's automated checks)
    if (typeof window !== 'undefined') window.__rlTest = { hitTest: hitTest };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', boot);
    else
        boot();
})();
