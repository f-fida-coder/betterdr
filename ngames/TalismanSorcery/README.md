# Talisman Sorcery — offline / embeddable slot

A self-contained 5-reel × 4-row, 50-line video slot. It runs the original game
engine and artwork with a local JavaScript backend (`offline-server.js`) that
answers every server call in the browser, so **no server, login, or network is
required**. Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
TalismanSorcery/
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
cd TalismanSorcery
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/TalismanSorcery/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## Win math — original

For this title, the captured `Init` response included the game's **own paytable
(`payt`) and paylines (`paths`)**, so the offline backend reproduces the original
win math exactly:

- **Reels:** the game's own captured 5×4 reel strips.
- **50 paylines:** the exact `paths` layout.
- **Paytable (coins per line):** A 75/200/800, B 50/150/500, C 40/120/400,
  D 30/90/300, E 25/75/250, F 15/50/200, G 15/50/200, H 10/40/100 (3/4/5),
  Wild 100/500/2000. Wild substitutes for all symbols and pays as its own line.
- **Scatter → free spins:** 3/4/5 scatters award 10 / 20 / 40 free spins.
  Free spins are auto-played with no additional bet and can retrigger.

Everything remains overridable via `window.SLOT_OFFLINE_CONFIG` (paytable,
paylines, reels, scatter free-spin counts, coin values, limits).

## Configuration

```js
window.SLOT_OFFLINE_CONFIG = {
  startBalance: 2000,
  minBet: 0.01, maxBet: 50,
  // override any of these to change the win math:
  paytStr: '3A:75,4A:200,5A:800,...,3W:100,4W:500,5W:2000,3X:FS10,4X:FS20,5X:FS40',
  pathsStr: '22222,11111,33333,44444,...',   // 50 lines, digits 1–4 (rows)
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
  (five reel strips), `paths` (50 paylines), `payt` (paytable), `iserr=0`.
- **Spin** (`lb`, `cv`, `fs`) → `reels=|r1|r2|r3|r4|r5|` (each four symbols,
  top→bottom), `cow` (coins won), `hits`, `frees` (free spins remaining),
  `bal`, `gid`, `iserr=0`.
- **hit entry format:** `<path>.<count><symbol>.<coins>` — `path` = the row
  (1–4) the line uses on each matched reel, left to right.

Symbols: `A`–`H` pay on lines, `W` = wild, `X` = scatter (free spins).
Total bet = `lb × cv`; total win = `cow × cv`.

## Notes

- Balance and free-spin state persist in `localStorage` (`slot_ts_*`); set
  `persist:false` for a fresh wallet each load.
- Fully static — no build step, no dependencies.
