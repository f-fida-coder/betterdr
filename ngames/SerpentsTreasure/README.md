# Serpent's Treasure — offline / embeddable slot

A self-contained 5-reel × 3-row, 9-line video slot. It runs the original game
engine and artwork with a local JavaScript backend (`offline-server.js`) that
answers every server call in the browser, so **no server, login, or network is
required**. Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
SerpentsTreasure/
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
cd SerpentsTreasure
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/SerpentsTreasure/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## Win math — original

The captured `Init` included the game's **own paytable (`payt`) and paylines
(`paths`)**, so the offline backend reproduces the base-game win math exactly:

- **Reels:** the game's own captured 5×3 reel strips.
- **9 paylines:** the exact `paths` layout.
- **Paytable (coins per line):** A, B, C, D and the Wild pay on **2 of a kind**;
  A 5/50/500/2500, B 3/30/150/500, C 2/20/100/400, D 2/20/75/300 (2/3/4/5);
  E, F 10/50/200, G 5/25/150, H 5/25/100 (3/4/5); Wild 50/500/5000/10000.
- **Scatter (X):** 3/4/5 scatters pay 5 / 25 / 100 × total bet.
- **Bonus (Z):** the original triggers a `Z` bonus round. No bonus data was
  captured, so it is **not triggered** in the offline build (the `Z` symbol still
  appears on the reels). Wire it up in your own backend if you need it.

Everything is overridable via `window.SLOT_OFFLINE_CONFIG`.

## Configuration

```js
window.SLOT_OFFLINE_CONFIG = {
  startBalance: 2000,
  minBet: 0.05, maxBet: 4.50,
  paytStr: '2A:5,3A:50,4A:500,5A:2500,...,2W:50,3W:500,4W:5000,5W:10000,3X:5,4X:25,5X:100',
  pathsStr: '22222,11111,33333,12321,32123,11211,33233,21112,23332',
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
same `key=value&...` format the client parses (commas in `paths`/`payt`/`cvals`
must stay literal, not URL-encoded):

- **Init** → `bal`, `minb`, `maxb`, `cvals`, `cvalsd`, `lb`, `lc`, `reesa`
  (five reel strips), `paths` (9 paylines), `payt` (paytable), `iserr=0`.
- **Spin** (`lb`, `cv`) → `reels=|r1|r2|r3|r4|r5|` (each three symbols, top→bottom),
  `cow` (coins won), `hits`, `bal`, `gid`, `iserr=0`.
- **hit entry format:** `<path>.<count><symbol>.<coins>` — `path` = the row (1–3)
  the line uses on each matched reel, left to right; scatter hits use path `S`.

Symbols: `A`–`H` pay on lines, `W` = wild, `X` = scatter, `Z` = bonus.
Total bet = `lb × cv`; total win = `cow × cv`.

## Notes

- Balance persists in `localStorage` (`slot_st_*`); set `persist:false` for a
  fresh wallet each load.
- Fully static — no build step, no dependencies.
