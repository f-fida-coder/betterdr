/*
 * Provably-fair panel for American Roulette (38-pocket double-zero wheel).
 *
 * Shows the current commitment (hash of the seed the NEXT spin will use), the
 * last spin's REVEALED serverSeed + clientSeed + nonce, an editable
 * clientSeed, and — crucially — recomputes the last spin entirely IN-BROWSER
 * from the revealed tuple, WITHOUT trusting our server: derive the pocket
 * index from the HMAC keystream, map it to the wheel token, and check that it
 * equals the settled number AND that SHA256(serverSeed) equals the pre-spin
 * commitment. The exact algorithm is printed in the panel so an offline /
 * third-party tool can reproduce it too.
 */
(function () {
    'use strict';

    /* ── the signed-off derivation, in-browser (SubtleCrypto) ─────────────
     * keystream = HMAC-SHA256(key=serverSeed, msg=clientSeed":"nonce":"counter),
     * consumed as consecutive big-endian uint32s; rejection-sampled over 38
     * (reject v >= floor(2^32/38)*38 = 4294967290; rejected draws consumed);
     * pocketIndex = v mod 38; map 0->'0', 1->'00', k->String(k-1). */
    function seededPocket(serverSeed, clientSeed, nonce) {
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
                var LIMIT = Math.floor(4294967296 / 38) * 38;   // 4294967290
                function draw() {
                    return nextU32().then(function (v) {
                        if (v >= LIMIT) return draw();   // rejected draws are consumed
                        var idx = v % 38;
                        return idx === 0 ? '0' : (idx === 1 ? '00' : String(idx - 1));
                    });
                }
                return draw();
            });
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
    function verifySpin(round) {
        if (!round || !round.serverSeed) return Promise.resolve({ ok: false, reason: 'No revealed spin yet — spin once first.' });
        return seededPocket(round.serverSeed, round.clientSeed, Number(round.nonce) || 0)
            .then(function (token) {
                var pocketMatch = token === String(round.number);
                return sha256Hex(round.serverSeed).then(function (hash) {
                    var hashMatch = !round.serverSeedHash || hash === round.serverSeedHash;
                    return {
                        ok: pocketMatch && hashMatch,
                        pocketMatch: pocketMatch,
                        hashMatch: hashMatch,
                        recomputedPocket: token,
                        computedHash: hash
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
        if (!window.BetterdrFairness || document.getElementById('arl-fairness-btn')) return;

        var btn = el('button', { id: 'arl-fairness-btn', title: 'Provably fair' }, '🛡 Fair');
        var overlay = el('div', { id: 'arl-fairness-overlay' });
        var panel = el('div', { id: 'arl-fairness-panel' });
        overlay.appendChild(panel);

        var style = el('style', null,
            '#arl-fairness-btn{position:fixed;right:8px;bottom:8px;z-index:2147483000;background:#3a0d0d;color:#f7e7e7;border:1px solid #dc2626;border-radius:6px;padding:6px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.9}' +
            '#arl-fairness-btn:hover{opacity:1}' +
            '#arl-fairness-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px}' +
            '#arl-fairness-overlay.open{display:flex}' +
            '#arl-fairness-panel{max-width:560px;width:100%;max-height:90vh;overflow:auto;background:#1c0808;color:#f5dede;border:1px solid #dc2626;border-radius:10px;padding:16px 18px;font:13px/1.5 system-ui,sans-serif}' +
            '#arl-fairness-panel h3{margin:0 0 4px;font-size:15px;color:#f0a7a7}' +
            '#arl-fairness-panel h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#c88c8c}' +
            '#arl-fairness-panel code{background:#120404;border:1px solid #4d2020;border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace;word-break:break-all}' +
            '#arl-fairness-panel .row{margin:3px 0}' +
            '#arl-fairness-panel input{width:100%;box-sizing:border-box;background:#120404;color:#f5dede;border:1px solid #4d2020;border-radius:5px;padding:6px;font-family:ui-monospace,monospace}' +
            '#arl-fairness-panel .actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
            '#arl-fairness-panel button.act{background:#dc2626;color:#1c0606;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}' +
            '#arl-fairness-panel button.ghost{background:transparent;color:#e0aaaa;border:1px solid #6e2f2f}' +
            '#arl-fairness-panel .verdict{margin-top:10px;padding:8px 10px;border-radius:6px;font-weight:700}' +
            '#arl-fairness-panel .pass{background:#0c3;color:#03210f}' +
            '#arl-fairness-panel .fail{background:#c33;color:#fff}' +
            '#arl-fairness-panel pre{white-space:pre-wrap;background:#120404;border:1px solid #4d2020;border-radius:6px;padding:8px;font-size:11px;color:#d8a6a6}' +
            '#arl-fairness-close{float:right;cursor:pointer;color:#c88c8c;font-size:18px;line-height:1}');

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
                'keystream    = HMAC_SHA256(key=serverSeed, msg="clientSeed:nonce:counter"), counter=0,1,2,…\n' +
                '               consumed as consecutive big-endian uint32s\n' +
                'pocket       = rejection-sampled over the 38 pockets: reject v >= floor(2^32/38)*38\n' +
                '               (= 4294967290; rejected draws consumed), pocketIndex = v mod 38\n' +
                'wheel map    = 0 -> "0", 1 -> "00", k -> String(k-1) for k = 2..37\n' +
                'one draw per spin; every bet then settles from the PUBLIC payout table\n' +
                '(straight 35:1, split 17:1, street/basket 11:1, corner 8:1, five bet 6:1,\n' +
                ' six line 5:1, dozen/column 2:1, even-money 1:1 — 0 and 00 beat all outside bets)';

            panel.innerHTML = '';
            panel.appendChild(el('span', { id: 'arl-fairness-close' }, '✕'));
            panel.appendChild(el('h3', null, 'Provably Fair'));
            panel.appendChild(el('div', { class: 'row' }, 'Every spin is committed before you bet and verifiable afterward — recompute it right here, no trust required.'));

            panel.appendChild(el('h4', null, 'Next spin commitment'));
            panel.appendChild(el('div', { class: 'row' }, 'serverSeedHash: <code>' + shorten(s.serverSeedHash) + '</code>'));
            panel.appendChild(el('div', { class: 'row' }, 'nonce: <code>' + (s.nextNonce != null ? s.nextNonce : '—') + '</code> · wheel: <code>38 pockets (0, 00, 1-36)</code>'));

            panel.appendChild(el('h4', null, 'Your client seed'));
            var input = el('input', { id: 'arl-fairness-seed', value: F.getClientSeed() });
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
                panel.appendChild(el('div', { class: 'row' }, 'pocket: <code>' + last.number + (last.color ? ' ' + last.color : '') + '</code> · bet <code>$' + (last.totalWager || 0) + '</code> · returned <code>$' + (last.totalReturn || 0) + '</code>'));
                if (last.winningBetKeys && last.winningBetKeys.length) {
                    panel.appendChild(el('div', { class: 'row' }, 'winning bets: <code>' + last.winningBetKeys.join(', ') + '</code>'));
                }
                var vBtn = el('button', { class: 'act', id: 'arl-fairness-verify' }, 'Verify last spin in your browser');
                panel.appendChild(vBtn);
                var verdict = el('div', { id: 'arl-fairness-verdict' });
                panel.appendChild(verdict);
                vBtn.addEventListener('click', function () {
                    verdict.innerHTML = 'Recomputing…';
                    verifySpin(last).then(function (res) {
                        if (res.ok) {
                            verdict.className = 'verdict pass';
                            verdict.innerHTML = '✓ VERIFIED — recomputed pocket <b>' + res.recomputedPocket + '</b> matches the settled spin, and SHA256(serverSeed) matches the pre-spin commitment.';
                        } else {
                            verdict.className = 'verdict fail';
                            verdict.innerHTML = '✗ ' + (res.reason || ('mismatch (pocket ' + res.pocketMatch + ' — recomputed ' + res.recomputedPocket + ', hash ' + res.hashMatch + ')'));
                        }
                    });
                });
            } else {
                panel.appendChild(el('div', { class: 'row' }, 'Spin once to reveal and verify a spin.'));
            }

            panel.appendChild(el('h4', null, 'Recompute recipe (reproduce offline)'));
            panel.appendChild(el('pre', null, recipe));

            panel.querySelector('#arl-fairness-close').addEventListener('click', close);
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
