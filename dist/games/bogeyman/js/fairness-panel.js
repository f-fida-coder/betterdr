/*
 * Provably-fair panel for Bogeyman (5-reel/25-line slot).
 *
 * Shows the current commitment (hash of the seed the NEXT spin will use), the
 * last spin's REVEALED serverSeed + clientSeed + nonce, the published reel
 * strips (with their SHA256 identity), an editable clientSeed, and — crucially
 * — recomputes the last spin entirely IN-BROWSER from the revealed tuple,
 * WITHOUT trusting our server: derive the 5 reel stops, re-read the windows
 * from the strips, re-evaluate the line wins, and check that
 * SHA256(serverSeed) equals the pre-spin commitment. The exact algorithm is
 * printed in the panel so an offline / third-party tool can reproduce it too.
 */
(function () {
    'use strict';

    var WILD = 'W';
    var SCATTER = 'X';
    // Base line pays in coins — the same fixed public paytable the server uses;
    // Phase-2 scaling is floor(coins x payoutScale) per hit, mirrored below.
    var PAYS = {
        '2A': 10, '3A': 35, '4A': 250, '5A': 1000, '3B': 30, '4B': 150, '5B': 750,
        '3C': 25, '4C': 120, '5C': 500, '3D': 20, '4D': 90, '5D': 300,
        '3E': 10, '4E': 30, '5E': 100, '3F': 10, '4F': 30, '5F': 100,
        '3G': 10, '4G': 30, '5G': 100, '3H': 10, '4H': 30, '5H': 100,
        '2W': 15, '3W': 75, '4W': 500, '5W': 3000
    };

    /* ── the signed-off derivation, in-browser (SubtleCrypto) ─────────────
     * keystream = HMAC-SHA256(key=serverSeed, msg=clientSeed":"nonce":"counter),
     * consumed as consecutive big-endian uint32s; stops drawn in reel order
     * 0→4 from that ONE stream, rejection-sampled per strip length (rejected
     * draws consumed), stop = (v mod L) + 1 (1-based). */
    function seededStops(serverSeed, clientSeed, nonce, strips) {
        var enc = new TextEncoder();
        var subtle = (window.crypto || window.msCrypto).subtle;
        return subtle.importKey('raw', enc.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
            .then(function (key) {
                var prefix = clientSeed + ':' + nonce + ':';
                var buffer = new Uint8Array(0), pos = 0, counter = 0;
                function nextU32() {
                    if (pos + 4 <= buffer.length) {
                        var v = (buffer[pos] * 0x1000000) + (buffer[pos + 1] << 16) + (buffer[pos + 2] << 8) + buffer[pos + 3];
                        pos += 4;
                        return Promise.resolve(v >>> 0);
                    }
                    return subtle.sign('HMAC', key, enc.encode(prefix + counter)).then(function (sig) {
                        buffer = new Uint8Array(sig); counter++; pos = 0;
                        return nextU32();
                    });
                }
                var stops = [], windows = [];
                function drawReel(r) {
                    if (r >= strips.length) return Promise.resolve({ stops: stops, windows: windows });
                    var L = strips[r].length;
                    var limit = Math.floor(4294967296 / L) * L;
                    function draw() {
                        return nextU32().then(function (v) {
                            if (v >= limit) return draw(); // rejected draws are consumed
                            var idx = v % L;
                            stops.push(idx + 1);
                            windows.push(strips[r][idx] + strips[r][(idx + 1) % L] + strips[r][(idx + 2) % L]);
                            return drawReel(r + 1);
                        });
                    }
                    return draw();
                }
                return drawReel(0);
            });
    }

    // Public line evaluation — byte-mirror of the server (and of the captured
    // vendor client): first-non-wild base, all-wild pays as wilds, scatter-led
    // lines pay nothing, longest run >= 2, floor(coins x payoutScale) per hit.
    function evaluate(windows, paths, lineCount, payoutScale) {
        var total = 0, tokens = [];
        var max = Math.min(Math.max(1, lineCount), paths.length);
        for (var li = 0; li < max; li++) {
            var path = paths[li], syms = [];
            for (var r = 0; r < 5; r++) syms.push(windows[r][parseInt(path[r], 10) - 1]);
            var base = null;
            for (var k = 0; k < 5; k++) { if (syms[k] !== WILD) { base = syms[k]; break; } }
            if (base === null) base = WILD;
            if (base === SCATTER) continue;
            var cnt = 0;
            for (var m = 0; m < 5; m++) { if (syms[m] === base || syms[m] === WILD) cnt++; else break; }
            for (var c = cnt; c >= 2; c--) {
                var key = c + base;
                if (PAYS[key]) {
                    var coins = Math.floor(PAYS[key] * payoutScale);
                    if (coins <= 0) break;
                    total += coins;
                    tokens.push(path.substring(0, Math.min(c + 1, 5)) + '.' + key + '.' + coins);
                    break;
                }
            }
        }
        return { coins: total, tokens: tokens };
    }

    function sha256Hex(str) {
        var enc = new TextEncoder();
        return (window.crypto || window.msCrypto).subtle.digest('SHA-256', enc.encode(str)).then(function (buf) {
            var bytes = new Uint8Array(buf), hex = '';
            for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
            return hex;
        });
    }

    // Full trustless verification of a revealed spin.
    function verifySpin(round, strips, paths) {
        if (!round || !round.serverSeed) return Promise.resolve({ ok: false, reason: 'No revealed spin yet — spin once first.' });
        return seededStops(round.serverSeed, round.clientSeed, Number(round.nonce) || 0, strips)
            .then(function (got) {
                var stopsMatch = got.stops.join(',') === (round.stops || []).map(Number).join(',');
                var reelsMatch = got.windows.join('|') === (round.reels || []).join('|');
                var evaled = evaluate(got.windows, paths, Number(round.lineCount) || 25, Number(round.payoutScale) || 1);
                var coinsMatch = evaled.coins === (Number(round.coinsWon) || 0);
                return Promise.all([sha256Hex(round.serverSeed), sha256Hex(strips.join(','))]).then(function (hashes) {
                    var hashMatch = !round.serverSeedHash || hashes[0] === round.serverSeedHash;
                    var stripsMatch = !round.stripsHash || hashes[1] === round.stripsHash;
                    return {
                        ok: stopsMatch && reelsMatch && coinsMatch && hashMatch && stripsMatch,
                        stopsMatch: stopsMatch,
                        reelsMatch: reelsMatch,
                        coinsMatch: coinsMatch,
                        hashMatch: hashMatch,
                        stripsMatch: stripsMatch,
                        recomputedStops: got.stops,
                        recomputedWindows: got.windows,
                        recomputedCoins: evaled.coins,
                        computedHash: hashes[0]
                    };
                });
            })
            .catch(function (err) { return { ok: false, reason: (err && err.message) || 'recompute failed' }; });
    }

    /* ── UI ───────────────────────────────────────────────────────────── */

    function el(tag, attrs, html) {
        var node = document.createElement(tag);
        if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
        if (html != null) node.innerHTML = html;
        return node;
    }
    function shorten(s) { s = String(s || ''); return s.length > 20 ? s.slice(0, 10) + '…' + s.slice(-8) : s; }

    function build() {
        if (!window.BetterdrFairness || document.getElementById('bgm-fairness-btn')) return;

        var btn = el('button', { id: 'bgm-fairness-btn', title: 'Provably fair' }, '🛡 Fair');
        var overlay = el('div', { id: 'bgm-fairness-overlay' });
        var panel = el('div', { id: 'bgm-fairness-panel' });
        overlay.appendChild(panel);

        var style = el('style', null,
            '#bgm-fairness-btn{position:fixed;right:8px;bottom:8px;z-index:2147483000;background:#2a1140;color:#f0e7f7;border:1px solid #8b5cf6;border-radius:6px;padding:6px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.9}' +
            '#bgm-fairness-btn:hover{opacity:1}' +
            '#bgm-fairness-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px}' +
            '#bgm-fairness-overlay.open{display:flex}' +
            '#bgm-fairness-panel{max-width:560px;width:100%;max-height:90vh;overflow:auto;background:#160b22;color:#e9def5;border:1px solid #8b5cf6;border-radius:10px;padding:16px 18px;font:13px/1.5 system-ui,sans-serif}' +
            '#bgm-fairness-panel h3{margin:0 0 4px;font-size:15px;color:#c4a7f0}' +
            '#bgm-fairness-panel h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#a58cc8}' +
            '#bgm-fairness-panel code{background:#0d0615;border:1px solid #33204d;border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace;word-break:break-all}' +
            '#bgm-fairness-panel .row{margin:3px 0}' +
            '#bgm-fairness-panel input{width:100%;box-sizing:border-box;background:#0d0615;color:#e9def5;border:1px solid #33204d;border-radius:5px;padding:6px;font-family:ui-monospace,monospace}' +
            '#bgm-fairness-panel .actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
            '#bgm-fairness-panel button.act{background:#8b5cf6;color:#12061f;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}' +
            '#bgm-fairness-panel button.ghost{background:transparent;color:#c3aae0;border:1px solid #4c2f6e}' +
            '#bgm-fairness-panel .verdict{margin-top:10px;padding:8px 10px;border-radius:6px;font-weight:700}' +
            '#bgm-fairness-panel .pass{background:#0c3;color:#03210f}' +
            '#bgm-fairness-panel .fail{background:#c33;color:#fff}' +
            '#bgm-fairness-panel pre{white-space:pre-wrap;background:#0d0615;border:1px solid #33204d;border-radius:6px;padding:8px;font-size:11px;color:#bda6d8}' +
            '#bgm-fairness-close{float:right;cursor:pointer;color:#a58cc8;font-size:18px;line-height:1}');

        document.body.appendChild(style);
        document.body.appendChild(btn);
        document.body.appendChild(overlay);

        function render() {
            var F = window.BetterdrFairness;
            var s = F.state || {};
            var last = F.lastRound;
            var recipe =
                'serverSeed_N = 32 fresh random bytes, generated when the PREVIOUS spin settled\n' +
                '               (Option A: no server secret exists — nothing to derive seeds from)\n' +
                'commitment   = SHA256(serverSeed_N) — shown to you BEFORE spin N\n' +
                'strips       = the 5 fixed public reel strips (identity: SHA256 of them,\n' +
                '               comma-joined, stamped on every spin as stripsHash)\n' +
                'keystream    = HMAC_SHA256(key=serverSeed, msg="clientSeed:nonce:counter"), counter=0,1,2,…\n' +
                '               consumed as consecutive big-endian uint32s\n' +
                'stops        = drawn in reel order 1..5 from that one stream; each draw\n' +
                '               rejection-sampled (reject v >= floor(2^32/L)*L, rejected draws\n' +
                '               consumed), then stop = (v mod L) + 1\n' +
                'window       = 3 consecutive strip symbols from the stop (wrapping)\n' +
                'wins         = public paytable evaluation; each hit pays floor(coins x payoutScale)';

            panel.innerHTML = '';
            panel.appendChild(el('span', { id: 'bgm-fairness-close' }, '✕'));
            panel.appendChild(el('h3', null, 'Provably Fair'));
            panel.appendChild(el('div', { class: 'row' }, 'Every spin is committed before you bet and verifiable afterward — recompute it right here, no trust required.'));

            panel.appendChild(el('h4', null, 'Next spin commitment'));
            panel.appendChild(el('div', { class: 'row' }, 'serverSeedHash: <code>' + shorten(s.serverSeedHash) + '</code>'));
            panel.appendChild(el('div', { class: 'row' }, 'nonce: <code>' + (s.nextNonce != null ? s.nextNonce : '—') + '</code> · strips: <code>' + shorten(s.stripsHash) + '</code>'));

            panel.appendChild(el('h4', null, 'Your client seed'));
            var input = el('input', { id: 'bgm-fairness-seed', value: F.getClientSeed() });
            panel.appendChild(input);
            var actions = el('div', { class: 'actions' });
            var applyBtn = el('button', { class: 'act' }, 'Apply seed');
            var randBtn = el('button', { class: 'ghost' }, 'Randomize');
            actions.appendChild(applyBtn);
            actions.appendChild(randBtn);
            panel.appendChild(actions);

            panel.appendChild(el('h4', null, 'Last spin (revealed)'));
            if (last && last.serverSeed) {
                panel.appendChild(el('div', { class: 'row' }, 'serverSeed: <code>' + shorten(last.serverSeed) + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'clientSeed: <code>' + shorten(last.clientSeed) + '</code> · nonce: <code>' + last.nonce + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'stops: <code>' + (last.stops || []).join(', ') + '</code> · reels: <code>' + (last.reels || []).join(' | ') + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'lines: <code>' + (last.lineCount || 25) + '</code> · payout scale: <code>' + (last.payoutScale || 1) + '×</code> · coins won: <code>' + (last.coinsWon || 0) + '</code>'));
                var vBtn = el('button', { class: 'act', id: 'bgm-fairness-verify' }, 'Verify last spin in your browser');
                panel.appendChild(vBtn);
                var verdict = el('div', { id: 'bgm-fairness-verdict' });
                panel.appendChild(verdict);
                vBtn.addEventListener('click', function () {
                    verdict.innerHTML = 'Recomputing…';
                    verifySpin(last, F.strips, F.paths).then(function (res) {
                        if (res.ok) {
                            verdict.className = 'verdict pass';
                            verdict.innerHTML = '✓ VERIFIED — recomputed stops [' + res.recomputedStops.join(', ') + '], windows, ' + res.recomputedCoins + ' coins and the commitment all match.';
                        } else {
                            verdict.className = 'verdict fail';
                            verdict.innerHTML = '✗ ' + (res.reason || ('mismatch (stops ' + res.stopsMatch + ', reels ' + res.reelsMatch + ', coins ' + res.coinsMatch + ', hash ' + res.hashMatch + ', strips ' + res.stripsMatch + ')'));
                        }
                    });
                });
            } else {
                panel.appendChild(el('div', { class: 'row' }, 'Spin once to reveal and verify a spin.'));
            }

            panel.appendChild(el('h4', null, 'Recompute recipe (reproduce offline)'));
            panel.appendChild(el('pre', null, recipe));

            panel.querySelector('#bgm-fairness-close').addEventListener('click', close);
            applyBtn.addEventListener('click', function () { F.setClientSeed(input.value); });
            randBtn.addEventListener('click', function () { F.setClientSeed(''); });
        }

        function open() { render(); overlay.classList.add('open'); }
        function close() { overlay.classList.remove('open'); }

        btn.addEventListener('click', open);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        window.BetterdrFairness.onChange(function () { if (overlay.classList.contains('open')) render(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
