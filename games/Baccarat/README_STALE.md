# STALE COPY — do not deploy

The served copy lives at `frontend/public/games/baccarat/` (built into `dist/`,
which is what nginx roots `/games/` to in production). This tree is retained
for reference only and has diverged from the served copy.

## Known bugs in THIS copy (already fixed in the served copy)

- `Math.ceil` balance display — `_formatMoney` rounds money **up**, so the
  on-screen balance can show more than the user actually has
  (`js/scenes/LocalScene.js`).
- Broken `/assets/splashscreen.webp` absolute path in `js/scenes/BootScene.js` —
  404s when the game is served under the `/games/baccarat/` subpath.
- Still loads Phaser from the jsdelivr CDN (`index.html`); the served copy
  self-hosts it at `vendor/phaser.min.js`.
- `this.clearBets()` typo (method is `clearBet`) — failed rounds never clear
  staged chips; the served copy fixes the call and its ordering.

Do not copy files from here over the served copy. If this tree is no longer
needed as a reference, delete it entirely rather than patching it.
