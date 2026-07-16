# Pai Gow Poker — offline / embeddable build

A self-contained Pai Gow Poker game. It runs the original game engine and
artwork with a local JavaScript backend (`offline-server.js`) that answers every
server call in the browser, so **no server, login, or network is required**.
Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
PaiGowPoker/
├── index.html              ← launcher (open this)
├── README.md
├── game/                   ← the game
│   ├── index.html
│   ├── GetLangXml.xml      ← translations (served locally)
│   ├── LoaderConfig.json
│   ├── css/  fonts/  images/  sounds/
│   └── js/
│       ├── paigow-game-server.js …  ← original engine
│       └── offline-server.js        ← the local backend (the only added file)
└── common/                 ← shared libs (jquery, jquery-ui, audio…)
```

Two folders: `game/` (this game) and `common/` (shared libraries). Everything is
relative-pathed, so the whole `PaiGowPoker` folder can live at any URL depth.

## Run locally

Serve over http (not `file://`, because it loads JSON/XML):

```bash
cd PaiGowPoker
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/PaiGowPoker/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Place a bet, press **DEAL** to get seven cards, split them into a 5-card back
hand and a 2-card front hand (or press **HOUSE WAY** to auto-arrange), then
**PLAY** to compare against the dealer. Win both hands to win (even money minus
5% commission); win one / lose one pushes; the dealer takes copies (ties).

## Configuration

Set `window.PAIGOW_OFFLINE_CONFIG` **before** `offline-server.js` loads to change
the demo wallet / rules:

```js
window.PAIGOW_OFFLINE_CONFIG = {
  startBalance: 2000,  // opening balance
  minBet: 1,           // table minimum
  maxBet: 100,         // table maximum
  commission: 0.05,    // house commission on wins (5%)
  persist: true        // remember the balance between sessions (localStorage)
};
```

Runtime helpers on `window.PaiGowOffline`:

```js
PaiGowOffline.getBalance();       // current balance
PaiGowOffline.resetBalance(2000); // reset the demo wallet
```

## Connecting a real wallet / backend

The offline backend is isolated in `game/js/offline-server.js`. To settle against
your own server, forward the `OpenGame.aspx` / `CloseGame.aspx` requests inside
the `$.ajax` hook and return the same `key=value&...` format the game parses:

- **OpenGame** (with `betamt`) → `p1..p7` (the 7 dealt cards), `pf1,pf2` +
  `pb1..pb5` (a suggested 2-card front / 5-card back), `gameid`, `balance`.
- **CloseGame** (client sends `H1..H7` = F/B per dealt card) → `db1..db5`,
  `df1,df2` (dealer back/front), `result` (`W`/`L`/`P`), `moneydelta`, `newbalance`.

**Card encoding:** index `1..52`, where `suit = floor((n-1)/13)` and
`rank = (n-1) % 13` (0 = Ace … 12 = King); `53` is the joker (semi-wild — plays
as an Ace or completes a straight/flush/straight-flush). Card images are
`game/images/Cards/<n>.png`.

## Notes

- Balances persist in `localStorage` (`pgp_offline_*` keys); set `persist:false`
  for a fresh wallet every load.
- Fully static — no build step, no dependencies to install.
