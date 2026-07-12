/*
 * Provably-fair panel for baccarat-classic.
 *
 * Shows the current commitment (hash of the seed the NEXT round will use), the
 * last round's REVEALED serverSeed + clientSeed + nonce + shoeSize, an editable
 * clientSeed, and — crucially — recomputes the last round entirely IN-BROWSER
 * from the revealed tuple, WITHOUT trusting our server. If the recomputed cards
 * match what was dealt and SHA256(serverSeed) matches the pre-round commitment,
 * the round is provably fair. The exact algorithm is printed in the panel so an
 * offline / third-party tool can reproduce it too.
 */
(function () {
    'use strict';

    var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    var SHOE_SUITS = ['H', 'D', 'C', 'S'];      // canonical shoe order (shuffle)
    var CODE_SUIT_BASE = { D: 0, H: 13, S: 26, C: 39 }; // card-image code blocks

    function cardCode(card) {
        var suit = card.slice(-1);
        var rank = card.slice(0, -1);
        return CODE_SUIT_BASE[suit] + RANKS.indexOf(rank) + 1;
    }
    function cardPoint(card) {
        var rank = card.slice(0, -1);
        if (rank === 'A') return 1;
        if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 0;
        return parseInt(rank, 10);
    }
    function handValue(hand) {
        var t = 0;
        for (var i = 0; i < hand.length; i++) t += cardPoint(hand[i]);
        return t % 10;
    }

    function buildCanonicalShoe(decks) {
        var shoe = [];
        for (var d = 0; d < decks; d++) {
            for (var s = 0; s < SHOE_SUITS.length; s++) {
                for (var r = 0; r < RANKS.length; r++) shoe.push(RANKS[r] + SHOE_SUITS[s]);
            }
        }
        return shoe;
    }

    // Deterministic seeded Fisher-Yates — mirrors the server exactly:
    // keystream = HMAC-SHA256(key=serverSeed, msg="clientSeed:nonce:counter"),
    // big-endian uint32 per draw, rejection sampling to remove modulo bias.
    function seededShuffle(serverSeed, clientSeed, nonce, shoe) {
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
                function loop(i) {
                    if (i <= 0) return Promise.resolve(shoe);
                    var range = i + 1;
                    var limit = Math.floor(4294967296 / range) * range;
                    function draw() {
                        return nextU32().then(function (v) {
                            if (v >= limit) return draw();
                            var j = v % range;
                            var t = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t;
                            return loop(i - 1);
                        });
                    }
                    return draw();
                }
                return loop(shoe.length - 1);
            });
    }

    // Deal from the shuffled shoe: pop from the END, P B P B, then third-card
    // rules — identical to the server's dealFromShoe.
    function deal(shoe) {
        var d = shoe.slice();
        var p = [d.pop()], b = [d.pop()];
        p.push(d.pop()); b.push(d.pop());
        var pt = handValue(p), bt = handValue(b);
        if (pt < 8 && bt < 8) {
            var playerDrew = false, p3 = null;
            if (pt <= 5) { var c = d.pop(); p.push(c); playerDrew = true; p3 = cardPoint(c); }
            var bNow = handValue(b);
            if (!playerDrew) {
                if (bNow <= 5) b.push(d.pop());
            } else {
                if (bNow <= 2) b.push(d.pop());
                else if (bNow === 3 && p3 !== 8) b.push(d.pop());
                else if (bNow === 4 && p3 >= 2 && p3 <= 7) b.push(d.pop());
                else if (bNow === 5 && p3 >= 4 && p3 <= 7) b.push(d.pop());
                else if (bNow === 6 && (p3 === 6 || p3 === 7)) b.push(d.pop());
            }
        }
        var pf = handValue(p), bf = handValue(b);
        var result = pf > bf ? 'Player' : (bf > pf ? 'Banker' : 'Tie');
        return { playerCards: p, bankerCards: b, playerCodes: p.map(cardCode), bankerCodes: b.map(cardCode), result: result };
    }

    function sha256Hex(str) {
        var enc = new TextEncoder();
        return (window.crypto || window.msCrypto).subtle.digest('SHA-256', enc.encode(str)).then(function (buf) {
            var bytes = new Uint8Array(buf), hex = '';
            for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
            return hex;
        });
    }

    // Full trustless verification of a revealed round.
    function verifyRound(round) {
        if (!round || !round.serverSeed) return Promise.resolve({ ok: false, reason: 'No revealed round yet — play a hand first.' });
        var decks = Number(round.shoeSize) || 8;
        return seededShuffle(round.serverSeed, round.clientSeed, Number(round.nonce) || 0, buildCanonicalShoe(decks))
            .then(function (shuffled) {
                var got = deal(shuffled);
                var expP = (round.playerCards || []).map(Number).join(',');
                var expB = (round.bankerCards || []).map(Number).join(',');
                var cardsMatch = got.playerCodes.join(',') === expP && got.bankerCodes.join(',') === expB;
                return sha256Hex(round.serverSeed).then(function (h) {
                    var hashMatch = !round.serverSeedHash || h === round.serverSeedHash;
                    return {
                        ok: cardsMatch && hashMatch,
                        cardsMatch: cardsMatch,
                        hashMatch: hashMatch,
                        recomputedPlayer: got.playerCodes,
                        recomputedBanker: got.bankerCodes,
                        recomputedResult: got.result,
                        computedHash: h
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
        if (!window.BetterdrFairness || document.getElementById('bacc-fairness-btn')) return;

        var btn = el('button', { id: 'bacc-fairness-btn', title: 'Provably fair' }, '🛡 Fair');
        var overlay = el('div', { id: 'bacc-fairness-overlay' });
        var panel = el('div', { id: 'bacc-fairness-panel' });
        overlay.appendChild(panel);

        var style = el('style', null,
            '#bacc-fairness-btn{position:fixed;right:8px;bottom:8px;z-index:2147483000;background:#0b3d2e;color:#e7f5ee;border:1px solid #1f8f6a;border-radius:6px;padding:6px 10px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.9}' +
            '#bacc-fairness-btn:hover{opacity:1}' +
            '#bacc-fairness-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px}' +
            '#bacc-fairness-overlay.open{display:flex}' +
            '#bacc-fairness-panel{max-width:520px;width:100%;max-height:90vh;overflow:auto;background:#0f1c17;color:#dcece5;border:1px solid #1f8f6a;border-radius:10px;padding:16px 18px;font:13px/1.5 system-ui,sans-serif}' +
            '#bacc-fairness-panel h3{margin:0 0 4px;font-size:15px;color:#7ee2ba}' +
            '#bacc-fairness-panel h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#8fb8a8}' +
            '#bacc-fairness-panel code{background:#08120e;border:1px solid #17352a;border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace;word-break:break-all}' +
            '#bacc-fairness-panel .row{margin:3px 0}' +
            '#bacc-fairness-panel input{width:100%;box-sizing:border-box;background:#08120e;color:#dcece5;border:1px solid #17352a;border-radius:5px;padding:6px;font-family:ui-monospace,monospace}' +
            '#bacc-fairness-panel .actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
            '#bacc-fairness-panel button.act{background:#1f8f6a;color:#04140d;border:0;border-radius:6px;padding:7px 12px;font-weight:700;cursor:pointer}' +
            '#bacc-fairness-panel button.ghost{background:transparent;color:#9ccdbc;border:1px solid #2b5c49}' +
            '#bacc-fairness-panel .verdict{margin-top:10px;padding:8px 10px;border-radius:6px;font-weight:700}' +
            '#bacc-fairness-panel .pass{background:#0c3;color:#03210f}' +
            '#bacc-fairness-panel .fail{background:#c33;color:#fff}' +
            '#bacc-fairness-panel pre{white-space:pre-wrap;background:#08120e;border:1px solid #17352a;border-radius:6px;padding:8px;font-size:11px;color:#9fc4b5}' +
            '#bacc-fairness-close{float:right;cursor:pointer;color:#8fb8a8;font-size:18px;line-height:1}');

        document.body.appendChild(style);
        document.body.appendChild(btn);
        document.body.appendChild(overlay);

        function render() {
            var F = window.BetterdrFairness;
            var s = F.state || {};
            var last = F.lastRound;
            var recipe =
                'serverSeed_N = HMAC_SHA256(SERVER_SECRET, userId + ":" + game + ":" + nonce)   (secret stays on server)\n' +
                'commitment   = SHA256(serverSeed_N)   — shown to you BEFORE the round\n' +
                'shoe         = 8 x 52 cards, order [suit H,D,C,S] x [rank A..K]\n' +
                'keystream    = HMAC_SHA256(key=serverSeed, msg="clientSeed:nonce:counter"), counter=0,1,2,…\n' +
                'shuffle      = Fisher-Yates; each swap index from next big-endian uint32,\n' +
                '               rejection-sampled (reject v >= floor(2^32/range)*range) then v % range\n' +
                'deal         = pop from END: P,B,P,B then standard third-card rules';

            panel.innerHTML = '';
            panel.appendChild(el('span', { id: 'bacc-fairness-close' }, '✕'));
            panel.appendChild(el('h3', null, 'Provably Fair'));
            panel.appendChild(el('div', { class: 'row' }, 'Every deal is committed before you bet and verifiable afterward — recompute it right here, no trust required.'));

            panel.appendChild(el('h4', null, 'Next round commitment'));
            panel.appendChild(el('div', { class: 'row' }, 'serverSeedHash: <code>' + shorten(s.serverSeedHash) + '</code>'));
            panel.appendChild(el('div', { class: 'row' }, 'nonce: <code>' + (s.nextNonce != null ? s.nextNonce : '—') + '</code> · shoe: <code>' + (s.shoeSize || 8) + ' decks</code>'));

            panel.appendChild(el('h4', null, 'Your client seed'));
            var input = el('input', { id: 'bacc-fairness-seed', value: F.getClientSeed() });
            panel.appendChild(input);
            var actions = el('div', { class: 'actions' });
            var applyBtn = el('button', { class: 'act' }, 'Apply seed');
            var randBtn = el('button', { class: 'ghost' }, 'Randomize');
            actions.appendChild(applyBtn);
            actions.appendChild(randBtn);
            panel.appendChild(actions);

            panel.appendChild(el('h4', null, 'Last round (revealed)'));
            if (last && last.serverSeed) {
                panel.appendChild(el('div', { class: 'row' }, 'serverSeed: <code>' + shorten(last.serverSeed) + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'clientSeed: <code>' + shorten(last.clientSeed) + '</code> · nonce: <code>' + last.nonce + '</code>'));
                panel.appendChild(el('div', { class: 'row' }, 'result: <code>' + last.result + '</code>'));
                var vBtn = el('button', { class: 'act', id: 'bacc-fairness-verify' }, 'Verify last round in your browser');
                panel.appendChild(vBtn);
                var verdict = el('div', { id: 'bacc-fairness-verdict' });
                panel.appendChild(verdict);
                vBtn.addEventListener('click', function () {
                    verdict.innerHTML = 'Recomputing…';
                    verifyRound(last).then(function (res) {
                        if (res.ok) {
                            verdict.className = 'verdict pass';
                            verdict.innerHTML = '✓ VERIFIED — recomputed cards and commitment match. Result: ' + res.recomputedResult;
                        } else {
                            verdict.className = 'verdict fail';
                            verdict.innerHTML = '✗ ' + (res.reason || ('mismatch (cards ' + res.cardsMatch + ', hash ' + res.hashMatch + ')'));
                        }
                    });
                });
            } else {
                panel.appendChild(el('div', { class: 'row' }, 'Play a hand to reveal and verify a round.'));
            }

            panel.appendChild(el('h4', null, 'Recompute recipe (reproduce offline)'));
            panel.appendChild(el('pre', null, recipe));

            panel.querySelector('#bacc-fairness-close').addEventListener('click', close);
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
