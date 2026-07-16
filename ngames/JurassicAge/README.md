# Jurassic Age — offline / embeddable slot

A self-contained 5-reel × 3-row, 30-line video slot. It runs the original game
engine and artwork with a local JavaScript backend (`offline-server.js`) that
answers every server call in the browser, so **no server, login, or network is
required**. Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
JurassicAge/
├── index.html              ← launcher (open this)
├── README.md
├── game/                   ← the slot
│   ├── index.html
│   ├── GetLangXml.xml      ← translations (served locally)
│   ├── LoaderConfig.json
│   ├── css/  fonts/  images/  sounds/
│   └── js/
│       ├── slots.js …      ← original engine
│       └── offline-server.js   ← the local backend (the only added file)
└── common/                 ← shared libs (jquery, jquery-ui, audio…)
```

## Run locally

```bash
cd JurassicAge
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/JurassicAge/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## Reels vs. win math (important)

- **Reels & artwork are the original.** The offline backend spins the game's own
  captured reel strips, so the reels look and behave exactly like the live game.
- **The paytable and paylines are your own.** The vendor's payout table and line
  definitions are computed server-side and were **not** part of the game files,
  so this build ships a clean, standard, fully-configurable set (default RTP
  ≈ 92%, 30 lines). Override it to match whatever win math you want — see below.

## Configuration

Set `window.SLOT_OFFLINE_CONFIG` **before** `offline-server.js` loads:

```js
window.SLOT_OFFLINE_CONFIG = {
  startBalance: 2000,
  // coins paid per line (1 coin/line) for 3 / 4 / 5 of a kind
  paytable: {
    A:{3:70,4:350,5:1400}, B:{3:55,4:275,5:1050}, C:{3:42,4:210,5:700},
    D:{3:35,4:175,5:560},  E:{3:35,4:140,5:525},  F:{3:28,4:105,5:420},
    G:{3:21,4:84,5:315},   H:{3:14,4:70,5:210},   I:{3:14,4:70,5:210}
  },
  scatter: 'X', wild: 'W',
  scatterPay: { 3:2, 4:10, 5:50 },   // × total bet
  paylines: [ /* thirty [r0,r1,r2,r3,r4] rows, 0=top 1=mid 2=bottom */ ],
  reels: [ /* five reel-strip strings — defaults to the captured strips */ ],
  persist: true
};
```

Runtime helpers on `window.SlotOffline`:

```js
SlotOffline.getBalance();
SlotOffline.resetBalance(2000);
```

## Connecting a real backend

The backend is isolated in `game/js/offline-server.js`. To settle against your own
server, forward `Init.aspx` / `Spin.aspx` inside the `$.ajax` hook and return the
same `key=value&...` format the client parses:

- **Init** → `bal`, `minb`, `maxb`, `cvals`, `cvalsd`, `lb`, `lc`, `reesa`
  (the five comma-separated reel strips), `iserr=0`.
- **Spin** (`lb`, `cv`, `fs`) → `reels=|r1|r2|r3|r4|r5|` (each three symbols,
  top→bottom), `cow` (total coins won), `hits` (per-line wins), `bal`, `gid`,
  `frees`, `iserr=0`.
- **hit entry format:** `<path>.<count><symbol>.<coins>` — e.g. `31113.5I.75`,
  where `path` is the row (1–3) the line uses on each matched reel, left to right.

Symbols: `A`–`I` pay on lines, `W` = wild (substitutes), `X` = scatter.
Total bet = `lb × cv`; total win = `cow × cv`.

## Notes

- Balance persists in `localStorage` (`slot_offline_*`); set `persist:false` for a
  fresh wallet each load.
- Fully static — no build step, no dependencies.
