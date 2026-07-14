/*
 * Provably-fair panel for Arabian (3x5, 20-line slot).
 *
 * Recomputes the last spin's 15-cell grid entirely IN-BROWSER from the revealed
 * (serverSeed, clientSeed, nonce), WITHOUT trusting our server: derive each cell
 * from the HMAC keystream + rejection-sampled cumulative symbol weights, rebuild
 * the grid, and check that SHA256(grid) == the round's gridHash and
 * SHA256(serverSeed) == the pre-spin commitment. The exact algorithm is printed
 * so an offline / third-party tool can reproduce it too.
 */
(function () {
    'use strict';

    var BONUS = 9; // bonus scatter symbol

    // Draw one cell: rejection-sampled uniform roll in [1, totalWeight], then the
    // identical cumulative-weight walk the server uses (pickArabianSymbol).
    function weightWalk(roll, weights) {
        var cursor = 0;
        for (var i = 0; i < weights.length; i++) {
            cursor += weights[i].w;
            if (roll <= cursor) { return weights[i].s; }
        }
        return weights[0].s;
    }

    /* keystream = HMAC-SHA256(key=serverSeed, msg="clientSeed:nonce:counter"),
     * consumed as consecutive big-endian uint32s. 15 cells row-major, then the
     * conditional bonus prize draw (only when the grid shows >= 3 bonus symbols). */
    function seededGrid(serverSeed, clientSeed, nonce, weightsMap, rows, reels) {
        var enc = new TextEncoder();
        var subtle = (window.crypto || window.msCrypto).subtle;
        // weightsMap: { "1": 1, ..., "10": 2 } -> ordered [{s,w}] by numeric symbol
        var weights = Object.keys(weightsMap).map(function (k) { return { s: parseInt(k, 10), w: Number(weightsMap[k]) }; })
            .sort(function (a, b) { return a.s - b.s; });
        var total = weights.reduce(function (t, x) { return t + Math.max(0, x.w); }, 0);
        var limit = Math.floor(4294967296 / total) * total;
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
                function drawCell() {
                    return nextU32().then(function (v) {
                        if (v >= limit) { return drawCell(); } // rejected draws consumed
                        return weightWalk((v % total) + 1, weights);
                    });
                }
                var pattern = [];
                function fill(r, c) {
                    if (r >= rows) { return Promise.resolve(pattern); }
                    if (c === 0) { pattern[r] = []; }
                    if (c >= reels) { return fill(r + 1, 0); }
                    return drawCell().then(function (sym) { pattern[r][c] = sym; return fill(r, c + 1); });
                }
                return fill(0, 0);
            });
    }

    function sha256Hex(str) {
        var enc = new TextEncoder();
        return (window.crypto || window.msCrypto).subtle.digest('SHA-256', enc.encode(str)).then(function (buf) {
            var bytes = new Uint8Array(buf), hex = '';
            for (var i = 0; i < bytes.length; i++) { hex += ('0' + bytes[i].toString(16)).slice(-2); }
            return hex;
        });
    }

    function verifySpin(round, state) {
        if (!round || !round.serverSeed) { return Promise.resolve({ ok: false, reason: 'No revealed spin yet — spin once first.' }); }
        var weightsMap = (state && state.symbolWeights) || {};
        var rows = (state && state.rows) || 3;
        var reels = (state && state.reels) || 5;
        return seededGrid(round.serverSeed, round.clientSeed, Number(round.nonce) || 0, weightsMap, rows, reels)
            .then(function (pattern) {
                var recomputedJson = JSON.stringify(pattern);
                var storedJson = JSON.stringify(round.pattern || []);
                var gridMatch = recomputedJson === storedJson;
                return Promise.all([sha256Hex(round.serverSeed), sha256Hex(recomputedJson)]).then(function (h) {
                    var hashMatch = !round.serverSeedHash || h[0] === round.serverSeedHash;
                    var gridHashMatch = !round.gridHash || h[1] === round.gridHash;
                    return {
                        ok: gridMatch && hashMatch && gridHashMatch,
                        gridMatch: gridMatch, hashMatch: hashMatch, gridHashMatch: gridHashMatch,
                        recomputed: pattern, computedHash: h[0], computedGridHash: h[1]
                    };
                });
            })
            .catch(function (err) { return { ok: false, reason: (err && err.message) || 'recompute failed' }; });
    }

    /* ── UI ───────────────────────────────────────────────────────────────── */
    function el(tag, attrs, html) {
        var node = document.createElement(tag);
        if (attrs) { for (var k in attrs) { if (attrs.hasOwnProperty(k)) { node.setAttribute(k, attrs[k]); } } }
        if (html != null) { node.innerHTML = html; }
        return node;
    }
    function shorten(s) { s = String(s || ''); return s.length > 20 ? s.slice(0, 10) + '…' + s.slice(-8) : s; }

    function build() {
        if (!window.BetterdrFairness || document.getElementById('arb-fairness-btn')) { return; }
        var btn = el('button', { id: 'arb-fairness-btn', title: 'Provably fair' }, '🛡 Fair');
        var overlay = el('div', { id: 'arb-fairness-overlay' });
        var panel = el('div', { id: 'arb-fairness-panel' });
        overlay.appendChild(panel);

        var style = el('style', null,
            '#arb-fairness-btn{position:fixed;right:8px;bottom:8px;z-index:2147483000;background:#3a1f5e;color:#f0e7f7;border:1px solid #a855f7;border-radius:6px;padding:6px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.9}' +
            '#arb-fairness-btn:hover{opacity:1}' +
            '#arb-fairness-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px}' +
            '#arb-fairness-overlay.open{display:flex}' +
            '#arb-fairness-panel{max-width:560px;width:100%;max-height:90vh;overflow:auto;background:#180d26;color:#e9def5;border:1px solid #a855f7;border-radius:10px;padding:16px 18px;font:13px/1.5 system-ui,sans-serif}' +
            '#arb-fairness-panel h3{margin:0 0 4px;font-size:15px;color:#d0b3f5}' +
            '#arb-fairness-panel h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#b08cd8}' +
            '#arb-fairness-panel code{background:#0d0615;border:1px solid #3a2456;border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace;word-break:break-all}' +
            '#arb-fairness-panel .row{margin:3px 0}' +
            '#arb-fairness-panel input{width:100%;box-sizing:border-box;background:#0d0615;color:#e9def5;border:1px solid #3a2456;border-radius:5px;padding:6px;font-family:ui-monospace,monospace}' +
            '#arb-fairness-panel .actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
            '#arb-fairness-panel button.act{background:#a855f7;color:#12061f;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}' +
            '#arb-fairness-panel button.ghost{background:transparent;color:#c9aae8;border:1px solid #57376e}' +
            '#arb-fairness-panel .verdict{margin-top:10px;padding:8px 10px;border-radius:6px;font-weight:700}' +
            '#arb-fairness-panel .pass{background:#0c3;color:#03210f}' +
            '#arb-fairness-panel .fail{background:#c33;color:#fff}' +
            '#arb-fairness-panel pre{white-space:pre-wrap;background:#0d0615;border:1px solid #3a2456;border-radius:6px;padding:8px;font-size:11px;color:#c3a6d8}' +
            '#arb-fairness-close{float:right;cursor:pointer;color:#b08cd8;font-size:18px;line-height:1}');
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
                'weights      = the fixed public symbol weights (identity: SHA256 as weightsHash)\n' +
                'keystream    = HMAC_SHA256(key=serverSeed, msg="clientSeed:nonce:counter"), counter=0,1,2,…\n' +
                '               consumed as consecutive big-endian uint32s\n' +
                'each cell    = reject v >= floor(2^32/W)*W (W=sum of weights), roll=(v mod W)+1,\n' +
                '               then walk the cumulative weights -> symbol; 15 cells row-major\n' +
                'grid         = 3 rows x 5 reels of those symbols; gridHash = SHA256(JSON(grid))\n' +
                'bonus        = one more draw ONLY when the grid shows >= 3 bonus symbols';

            panel.innerHTML = '';
            panel.appendChild(el('span', { id: 'arb-fairness-close' }, '✕'));
            panel.appendChild(el('h3', null, 'Provably Fair'));
            panel.appendChild(el('div', { class: 'row' }, 'Every spin is committed before you bet and verifiable afterward — recompute it right here, no trust required.'));

            panel.appendChild(el('h4', null, 'Next spin commitment'));
            panel.appendChild(el('div', { class: 'row' }, 'serverSeedHash: <code>' + shorten(s.serverSeedHash) + '</code>'));
            panel.appendChild(el('div', { class: 'row' }, 'nonce: <code>' + (s.nextNonce != null ? s.nextNonce : '—') + '</code> · weights: <code>' + shorten(s.weightsHash) + '</code>'));

            panel.appendChild(el('h4', null, 'Your client seed'));
            var input = el('input', { id: 'arb-fairness-seed', value: F.getClientSeed() });
            panel.appendChild(input);
            var actions = el('div', { class: 'actions' });
            var applyBtn = el('button', { class: 'act' }, 'Apply seed');
            var randBtn = el('button', { class: 'ghost' }, 'Randomize');
            actions.appendChild(applyBtn); actions.appendChild(randBtn);
            panel.appendChild(actions);

            panel.appendChild(el('h4', null, 'Last spin (revealed)'));
            if (last && last.serverSeed) {
                panel.appendChild(el('div', { class: 'row' }, 'serverSeed: <code>' + shorten(last.serverSeed) + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'clientSeed: <code>' + shorten(last.clientSeed) + '</code> · nonce: <code>' + last.nonce + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'grid: <code>' + JSON.stringify(last.pattern || []) + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'lines: <code>' + (last.lineCount || 0) + '</code> · scale: <code>' + (last.payoutScale || 1) + '×</code> · win: <code>' + (last.totalWin || 0) + '</code>'));
                var vBtn = el('button', { class: 'act', id: 'arb-fairness-verify' }, 'Verify last spin in your browser');
                panel.appendChild(vBtn);
                var verdict = el('div', { id: 'arb-fairness-verdict' });
                panel.appendChild(verdict);
                vBtn.addEventListener('click', function () {
                    verdict.innerHTML = 'Recomputing…';
                    verifySpin(last, F.state).then(function (res) {
                        if (res.ok) {
                            verdict.className = 'verdict pass';
                            verdict.innerHTML = '✓ VERIFIED — the recomputed grid ' + JSON.stringify(res.recomputed) + ', its gridHash and the commitment all match.';
                        } else {
                            verdict.className = 'verdict fail';
                            verdict.innerHTML = '✗ ' + (res.reason || ('mismatch (grid ' + res.gridMatch + ', gridHash ' + res.gridHashMatch + ', commitment ' + res.hashMatch + ')'));
                        }
                    });
                });
            } else {
                panel.appendChild(el('div', { class: 'row' }, 'Spin once to reveal and verify a spin.'));
            }

            panel.appendChild(el('h4', null, 'Recompute recipe (reproduce offline)'));
            panel.appendChild(el('pre', null, recipe));

            panel.querySelector('#arb-fairness-close').addEventListener('click', close);
            applyBtn.addEventListener('click', function () { F.setClientSeed(input.value); });
            randBtn.addEventListener('click', function () { F.setClientSeed(''); });
        }

        function open() { window.BetterdrFairness.refresh(); render(); overlay.classList.add('open'); }
        function close() { overlay.classList.remove('open'); }
        btn.addEventListener('click', open);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });
        window.BetterdrFairness.onChange(function () { if (overlay.classList.contains('open')) { render(); } });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
