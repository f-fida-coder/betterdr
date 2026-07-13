/*
 * Provably-fair panel for Aces & Eights (VP_Classic_D video poker).
 *
 * Shows the next-round commitment (hash of the seed the NEXT deal will use),
 * the last SETTLED hand's REVEALED serverSeed + clientSeed + nonce + holds,
 * and — crucially — recomputes that whole two-stage hand entirely IN-BROWSER
 * from the revealed tuple, WITHOUT trusting our server: reproduce the seeded
 * 52-card shuffle, take the deal (positions 0-4), apply the hold mask, draw the
 * replacements from the fixed committed order, classify the final hand, and
 * check that SHA256(serverSeed) equals the pre-deal commitment. The exact
 * algorithm is printed in the panel so an offline / third-party tool can
 * reproduce it too. No server call anywhere in the verify path.
 *
 * DEFERRED REVEAL: an OPEN ('dealt') hand exposes only the commitment — the
 * serverSeed is withheld until the hand settles at draw, so this panel can
 * never help a player see the undrawn deck mid-hand.
 */
(function () {
    'use strict';

    var DECK = 52;
    var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    var SUITS = ['♦', '♥', '♠', '♣']; // ♦ ♥ ♠ ♣  (codes 1-13,14-26,27-39,40-52)
    var HAND_NAMES = {
        JB: 'Jacks or Better', '2P': 'Two Pair', '3K': 'Three of a Kind',
        ST: 'Straight', FL: 'Flush', FH: 'Full House',
        '4K': 'Four of a Kind', '47': 'Four Sevens', SF: 'Straight Flush',
        A8: 'Four Aces or Eights', NR: 'Natural Royal Flush', '-': 'No Hand'
    };

    function cardLabel(n) {
        n = Number(n);
        if (!(n >= 1 && n <= 52)) return '?';
        return RANKS[(n - 1) % 13] + SUITS[Math.floor((n - 1) / 13)];
    }

    /* ── the signed-off derivation, in-browser (SubtleCrypto) ─────────────
     * keystream = HMAC-SHA256(key=serverSeed, msg="clientSeed:nonce:counter"),
     * counter=0,1,2,…, consumed as consecutive big-endian uint32s. Fisher-Yates
     * over the canonical deck [1..52] (natural order): for i=51..1, range=i+1,
     * reject v >= floor(2^32/range)*range (rejected draws consumed), j=v%range,
     * swap. Identical to the server's seededShuffleShoe over 52 cards. */
    function seededDeck(serverSeed, clientSeed, nonce) {
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
                var deck = [];
                for (var n = 1; n <= DECK; n++) deck.push(n);
                var i = DECK - 1;
                function step() {
                    if (i <= 0) return Promise.resolve(deck);
                    var range = i + 1;
                    var limit = Math.floor(4294967296 / range) * range;
                    function draw() {
                        return nextU32().then(function (v) {
                            if (v >= limit) return draw(); // rejected draws consumed
                            var j = v % range;
                            var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
                            i--;
                            return step();
                        });
                    }
                    return draw();
                }
                return step();
            });
    }

    // Independent hand evaluator — mirrors the server's acesAndEightsHandCode
    // (rank idx 0=Ace→14; wheel A-2-3-4-5 is a straight; NR distinct from SF;
    // quads split A/8 vs 7 vs base).
    function classify(cards) {
        var ranks = [], suits = [], i;
        for (i = 0; i < 5; i++) {
            var n = Number(cards[i]);
            var idx = (n - 1) % 13;
            ranks.push(idx === 0 ? 14 : idx + 1);
            suits.push(Math.floor((n - 1) / 13));
        }
        var flush = suits.every(function (s) { return s === suits[0]; });
        var cnt = {};
        ranks.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
        var uniq = Object.keys(cnt).map(Number).sort(function (a, b) { return b - a; });
        var sizes = uniq.map(function (r) { return cnt[r]; }).sort(function (a, b) { return b - a; });
        var straight = false;
        if (uniq.length === 5) {
            if (uniq[0] - uniq[4] === 4) straight = true;
            else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straight = true; // wheel
        }
        var royal = straight && flush && uniq[0] === 14 && uniq[4] === 10;
        if (royal) return 'NR';
        if (straight && flush) return 'SF';
        if (sizes[0] === 4) {
            var quad = uniq.filter(function (r) { return cnt[r] === 4; })[0];
            if (quad === 14 || quad === 8) return 'A8';
            if (quad === 7) return '47';
            return '4K';
        }
        if (sizes[0] === 3 && sizes[1] === 2) return 'FH';
        if (flush) return 'FL';
        if (straight) return 'ST';
        if (sizes[0] === 3) return '3K';
        if (sizes[0] === 2 && sizes[1] === 2) return '2P';
        if (sizes[0] === 2) {
            var pr = uniq.filter(function (r) { return cnt[r] === 2; })[0];
            return (pr >= 11) ? 'JB' : '-';
        }
        return '-';
    }

    function sha256Hex(str) {
        var enc = new TextEncoder();
        return (window.crypto || window.msCrypto).subtle.digest('SHA-256', enc.encode(str)).then(function (buf) {
            var b = new Uint8Array(buf), hex = '';
            for (var i = 0; i < b.length; i++) hex += ('0' + b[i].toString(16)).slice(-2);
            return hex;
        });
    }

    // Recompute the FULL hand from the revealed tuple + holds, independently.
    function verifyHand(round) {
        var holds = (round.holds || []).map(function (h) { return !!h; });
        while (holds.length < 5) holds.push(false);
        return Promise.all([
            seededDeck(round.serverSeed, round.clientSeed, round.nonce),
            sha256Hex(round.serverSeed)
        ]).then(function (out) {
            var deck = out[0], computedHash = out[1];
            var dealt = deck.slice(0, 5);
            var final = dealt.slice();
            var ptr = 5;
            for (var i = 0; i < 5; i++) {
                if (!holds[i]) { final[i] = deck[ptr]; ptr++; }
            }
            var code = classify(final);
            var dealtMatch = !round.dealt || !round.dealt.length || round.dealt.join(',') === dealt.join(',');
            var finalMatch = !round.final || !round.final.length || round.final.join(',') === final.join(',');
            var codeMatch = !round.finalHandCode || round.finalHandCode === code;
            // Commitment: SHA256(revealed serverSeed) must equal the hash that
            // was committed to BEFORE the deal (stored as serverSeedHash).
            var hashMatch = !round.serverSeedHash || computedHash === round.serverSeedHash;
            return {
                ok: dealtMatch && finalMatch && codeMatch && hashMatch,
                dealtMatch: dealtMatch, finalMatch: finalMatch, codeMatch: codeMatch, hashMatch: hashMatch,
                recomputedDealt: dealt, recomputedFinal: final, recomputedCode: code, computedHash: computedHash
            };
        }).catch(function (err) { return { ok: false, reason: (err && err.message) || 'recompute failed' }; });
    }

    /* ── UI ───────────────────────────────────────────────────────────── */

    function el(tag, attrs, html) {
        var node = document.createElement(tag);
        if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
        if (html != null) node.innerHTML = html;
        return node;
    }
    function shorten(s) { s = String(s || ''); return s.length > 20 ? s.slice(0, 10) + '…' + s.slice(-8) : s; }
    function hand(cards) { return (cards || []).map(cardLabel).join(' '); }
    function heldHand(cards, holds) {
        return (cards || []).map(function (c, i) { return cardLabel(c) + (holds && holds[i] ? '·' : ''); }).join(' ');
    }

    function build() {
        if (!window.BetterdrFairness || document.getElementById('vpa8-fairness-btn')) return;

        var btn = el('button', { id: 'vpa8-fairness-btn', title: 'Provably fair' }, '🛡 Fair');
        var overlay = el('div', { id: 'vpa8-fairness-overlay' });
        var panel = el('div', { id: 'vpa8-fairness-panel' });
        overlay.appendChild(panel);

        var style = el('style', null,
            '#vpa8-fairness-btn{position:fixed;right:8px;bottom:8px;z-index:2147483000;background:#06302b;color:#d7f5ee;border:1px solid #14b8a6;border-radius:6px;padding:6px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.9}' +
            '#vpa8-fairness-btn:hover{opacity:1}' +
            '#vpa8-fairness-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px}' +
            '#vpa8-fairness-overlay.open{display:flex}' +
            '#vpa8-fairness-panel{max-width:560px;width:100%;max-height:90vh;overflow:auto;background:#08211d;color:#dcf3ee;border:1px solid #14b8a6;border-radius:10px;padding:16px 18px;font:13px/1.5 system-ui,sans-serif}' +
            '#vpa8-fairness-panel h3{margin:0 0 4px;font-size:15px;color:#5eead4}' +
            '#vpa8-fairness-panel h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#7fd8c9}' +
            '#vpa8-fairness-panel code{background:#04120f;border:1px solid #124e45;border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace;word-break:break-all}' +
            '#vpa8-fairness-panel .row{margin:3px 0}' +
            '#vpa8-fairness-panel input{width:100%;box-sizing:border-box;background:#04120f;color:#dcf3ee;border:1px solid #124e45;border-radius:5px;padding:6px;font-family:ui-monospace,monospace}' +
            '#vpa8-fairness-panel .actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
            '#vpa8-fairness-panel button.act{background:#14b8a6;color:#042925;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}' +
            '#vpa8-fairness-panel button.ghost{background:transparent;color:#8feee0;border:1px solid #1f6b5f}' +
            '#vpa8-fairness-panel .verdict{margin-top:10px;padding:8px 10px;border-radius:6px;font-weight:700}' +
            '#vpa8-fairness-panel .pass{background:#0c3;color:#03210f}' +
            '#vpa8-fairness-panel .fail{background:#c33;color:#fff}' +
            '#vpa8-fairness-panel pre{white-space:pre-wrap;background:#04120f;border:1px solid #124e45;border-radius:6px;padding:8px;font-size:11px;color:#a7ddd2}' +
            '#vpa8-fairness-close{float:right;cursor:pointer;color:#7fd8c9;font-size:18px;line-height:1}');

        document.body.appendChild(style);
        document.body.appendChild(btn);
        document.body.appendChild(overlay);

        function render() {
            var F = window.BetterdrFairness;
            var s = F.state || {};
            var last = F.lastRound;
            var recipe =
                'serverSeed_N = 32 fresh random bytes, generated when the PREVIOUS hand was dealt\n' +
                '               (Option A: no server secret exists — nothing to derive seeds from)\n' +
                'commitment   = SHA256(serverSeed_N) — shown to you BEFORE hand N is dealt\n' +
                '               and NOT revealed until the hand SETTLES at draw (deferred reveal)\n' +
                'canonical    = the deck [1,2,…,52] in natural order (♦A..♦K,♥A..♥K,♠A..♠K,♣A..♣K)\n' +
                'keystream    = HMAC_SHA256(key=serverSeed, msg="clientSeed:nonce:counter"), counter=0,1,2,…\n' +
                '               consumed as consecutive big-endian uint32s\n' +
                'shuffle      = Fisher-Yates i=51..1: range=i+1; reject v>=floor(2^32/range)*range\n' +
                '               (rejected draws consumed); j=v mod range; swap deck[i],deck[j]\n' +
                'deal         = shuffled positions 0..4\n' +
                'draw         = each NON-held position replaced left-to-right by the next position\n' +
                '               5,6,… of the SAME shuffled deck (your holds pick which committed\n' +
                '               cards are used; they cannot change the committed order)\n' +
                'final hand   = classified on the standard poker ranks (Aces & Eights quad bonuses)';

            panel.innerHTML = '';
            panel.appendChild(el('span', { id: 'vpa8-fairness-close' }, '✕'));
            panel.appendChild(el('h3', null, 'Provably Fair'));
            panel.appendChild(el('div', { class: 'row' }, 'Every hand is committed before you bet and verifiable afterward — recompute it right here, no trust required. The seed stays hidden until the hand is over.'));

            panel.appendChild(el('h4', null, 'Next hand commitment'));
            panel.appendChild(el('div', { class: 'row' }, 'serverSeedHash: <code>' + shorten(s.serverSeedHash) + '</code>'));
            panel.appendChild(el('div', { class: 'row' }, 'nonce: <code>' + (s.nextNonce != null ? s.nextNonce : '—') + '</code> · deck: <code>52 cards</code>'));

            panel.appendChild(el('h4', null, 'Your client seed'));
            var input = el('input', { id: 'vpa8-fairness-seed', value: F.getClientSeed() });
            panel.appendChild(input);
            var actions = el('div', { class: 'actions' });
            var applyBtn = el('button', { class: 'act' }, 'Apply seed');
            var randBtn = el('button', { class: 'ghost' }, 'Randomize');
            actions.appendChild(applyBtn);
            actions.appendChild(randBtn);
            panel.appendChild(actions);

            panel.appendChild(el('h4', null, 'Last hand (revealed at settlement)'));
            if (last && last.serverSeed) {
                panel.appendChild(el('div', { class: 'row' }, 'serverSeed: <code>' + shorten(last.serverSeed) + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'clientSeed: <code>' + shorten(last.clientSeed) + '</code> · nonce: <code>' + last.nonce + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'dealt: <code>' + heldHand(last.dealt, last.holds) + '</code> (· = held)'));
                panel.appendChild(el('div', { class: 'row' }, 'final: <code>' + hand(last.final) + '</code> → <code>' + (HAND_NAMES[last.finalHandCode] || last.finalHandName || last.finalHandCode || '') + '</code>'));
                var vBtn = el('button', { class: 'act', id: 'vpa8-fairness-verify' }, 'Verify last hand in your browser');
                panel.appendChild(vBtn);
                var verdict = el('div', { id: 'vpa8-fairness-verdict' });
                panel.appendChild(verdict);
                vBtn.addEventListener('click', function () {
                    verdict.innerHTML = 'Recomputing…';
                    verifyHand(last).then(function (res) {
                        if (res.ok) {
                            verdict.className = 'verdict pass';
                            verdict.innerHTML = '✓ VERIFIED — recomputed deal [' + res.recomputedDealt.map(cardLabel).join(' ') +
                                '], final [' + res.recomputedFinal.map(cardLabel).join(' ') + '] = ' + (HAND_NAMES[res.recomputedCode] || res.recomputedCode) +
                                ', and SHA256(serverSeed) matches the pre-deal commitment.';
                        } else {
                            verdict.className = 'verdict fail';
                            verdict.innerHTML = '✗ ' + (res.reason || ('mismatch (dealt ' + res.dealtMatch + ', final ' + res.finalMatch + ', rank ' + res.codeMatch + ', commitment ' + res.hashMatch + ')'));
                        }
                    });
                });
            } else {
                panel.appendChild(el('div', { class: 'row' }, 'Play a full hand (deal then draw) to reveal and verify it. An open hand shows only the commitment — never the seed.'));
            }

            panel.appendChild(el('h4', null, 'Recompute recipe (reproduce offline)'));
            panel.appendChild(el('pre', null, recipe));

            panel.querySelector('#vpa8-fairness-close').addEventListener('click', close);
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
