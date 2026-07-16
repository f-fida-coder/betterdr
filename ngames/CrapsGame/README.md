# Craps — offline / embeddable build

A self-contained Craps game. It runs the original game engine and artwork with
a local JavaScript backend (`offline-server.js`) that answers every server call
in the browser, so **no server, login, or network is required**. Drop the folder
onto any static host (or into a page via `<iframe>`) and it just works.

## Folder layout

```
CrapsGame/
├── index.html              ← launcher (open this)
├── README.md
├── game/                   ← the craps game
│   ├── index.html
│   ├── GetLangXml.xml      ← translations (served locally)
│   ├── LoaderConfig.json
│   ├── css/  fonts/  images/  sounds/
│   └── js/
│       ├── craps.js …      ← original engine
│       └── offline-server.js   ← the local backend (the only added file)
└── common/                 ← shared libs (jquery, three.js, cannon.js, audio…)
```

Just two folders: `game/` (this game) and `common/` (shared libraries).
Everything is relative-pathed, so the whole `CrapsGame` folder can live at any
URL depth on any host.

## Run locally

Any static file server works (the game must be served over http, not opened
as a `file://` path, because it loads JSON/XML):

```bash
cd CrapsGame
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

Copy the `CrapsGame` folder into your web root and iframe it:

```html
<iframe src="/CrapsGame/index.html"
        style="border:0;width:100%;height:100%"
        allowfullscreen></iframe>
```

That's the whole integration. The launcher (`index.html`) sets the chip values,
currency and language via the query string; edit it there, or point your iframe
straight at `games/CLASSiC/hTml5GAmes/CP/index.html?...` with your own params.

## Configuration

Set `window.CRAPS_OFFLINE_CONFIG` **before** `offline-server.js` loads (e.g. add
a small inline `<script>` at the top of the CP `index.html`) to change the demo
wallet:

```js
window.CRAPS_OFFLINE_CONFIG = {
  startBalance: 2000,   // opening balance
  minBet: 1,            // table minimum
  maxBet: 100,          // per-spot maximum
  persist: true         // remember the balance between sessions (localStorage)
};
```

Runtime helpers are exposed on `window.CrapsOffline`:

```js
CrapsOffline.getBalance();       // current balance
CrapsOffline.resetBalance(2000); // reset the demo wallet
```

## Connecting a real wallet / backend

The offline backend is deliberately isolated in one file. To settle against your
own server instead of the local engine, open
`games/CLASSiC/hTml5GAmes/CP/js/offline-server.js` and, inside the `$.ajax`
hook, forward the `roll.aspx` / `Recover.aspx` requests to your endpoint and
return its response in the same `key=value&...` format the game parses:

- **Recover** → `bal`, `minb`, `maxb`, `cupo` (point, `-1` on come-out), `totb`,
  `isrec`, plus `bet<code>=amt` for any bets to restore.
- **roll** → `d1`, `d2` (the dice), `cupo`, `bal`, `totb`, `res<code>=netProfit`
  for resolved bets and `bet<code>=amt` for bets still working.

Bet codes: `pa`/`opa` pass + odds, `dp`/`odp` don't pass + odds, `cm`/`dc`
come / don't-come, `co4..10`/`oco4..10` come point + odds, `do4..10`/`odo4..10`
don't-come + odds, `pl4..10` place, `by4..10` buy, `ly4..10` lay, `bg6`/`bg8`
big 6/8, `fd` field, `hd4/6/8/10` hardways, `hn2/3/11/12` single-roll numbers,
`sv` any seven, `ac` any craps.

## Payouts implemented

Pass/Come 1:1 · Don't Pass/Come 1:1 (12 pushes) · odds at true odds
(4/10 → 2:1, 5/9 → 3:2, 6/8 → 6:5) · Field 1:1 with 2× on 2 and 3× on 12 ·
Big 6/8 1:1 · Place 4/10 → 9:5, 5/9 → 7:5, 6/8 → 7:6 · Buy at true odds ·
Hard 4/10 → 7:1, Hard 6/8 → 9:1 · 3 or 11 → 15:1, 2 or 12 → 30:1 ·
Any Seven 4:1 · Any Craps 7:1.

## Notes

- Balances/points persist in `localStorage` per browser (`cp_offline_*` keys);
  set `persist:false` for a fresh wallet every load.
- The build is fully static — no build step, no dependencies to install.
