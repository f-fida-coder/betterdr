# Three Card Poker — offline / embeddable build

A self-contained Three Card Poker game. It runs the original game engine and
artwork with a local JavaScript backend (`offline-server.js`) that answers every
server call in the browser, so **no server, login, or network is required**.
Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
ThreeCardPoker/
├── index.html              ← launcher (open this)
├── README.md
├── game/                   ← the game
│   ├── index.html
│   ├── GetLangXml.xml      ← translations (served locally)
│   ├── LoaderConfig.json
│   ├── css/  fonts/  images/  sounds/
│   └── js/
│       ├── pk3c.js …       ← original engine
│       └── offline-server.js   ← the local backend (the only added file)
└── common/                 ← shared libs (jquery, jquery-ui, audio…)
```

Two folders: `game/` (this game) and `common/` (shared libraries). Everything is
relative-pathed, so the whole `ThreeCardPoker` folder can live at any URL depth.

## Run locally

```bash
cd ThreeCardPoker
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/ThreeCardPoker/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Place an **Ante** (required to play) and/or an optional **Pair Plus** side bet,
press **DEAL** to get three cards, then **PLAY** (match your ante) or **FOLD**.
The dealer needs Queen-high or better to qualify:
- Dealer doesn't qualify → ante pays 1:1, play bet pushes.
- Dealer qualifies → higher 3-card hand wins ante + play 1:1; ties push.
The **Ante Bonus** and **Pair Plus** pay on your hand regardless of the dealer.

Hand ranking: straight flush > three of a kind > straight > flush > pair > high.

## Configuration

Set `window.TCP_OFFLINE_CONFIG` **before** `offline-server.js` loads to change the
demo wallet and pay tables:

```js
window.TCP_OFFLINE_CONFIG = {
  startBalance: 2000,
  minBet: 1,
  maxBet: 100,
  anteBonus: { ST: 1, '3K': 4, SF: 5 },                  // straight / trips / straight flush
  pairPlus:  { '2K': 1, FL: 4, ST: 6, '3K': 25, SF: 40 },// pair / flush / straight / trips / SF
  persist: true
};
```

Runtime helpers on `window.TcpOffline`:

```js
TcpOffline.getBalance();
TcpOffline.resetBalance(2000);
```

## Connecting a real wallet / backend

The offline backend is isolated in `game/js/offline-server.js`. To settle against
your own server, forward the `Start` / `Deal` / `Call` requests inside the `$.ajax`
hook and return the same `key=value&...` format the game parses:

- **Start** → `minbet`, `maxbet`, `prizes` (pay-table string), `gameid=0`, `balance`.
- **Deal** (`anteAmt`, `pairplusAmt`) → `pc1..pc3` (the three cards), `ph` (hand code).
  With ante the round waits for **Call**; pair-plus-only resolves in Deal.
- **Call** (`Call=Y|N`) → `dc1..dc3`, `dh` (dealer hand code), `anteres`, `ppres`,
  `bonusres`, `resultamt` (net), `newbalance`.

**Card encoding:** index `1..52`, `suit = floor((n-1)/13)`, `rank = (n-1)%13`
(0 = Ace … 12 = King). Card images are `game/images/Cards/<n>.png`. Hand codes:
`SF`, `3K`, `ST`, `FL`, `2K`, `-` (high card).

## Notes

- Balances persist in `localStorage` (`tcp_offline_*` keys); set `persist:false`
  for a fresh wallet every load.
- Fully static — no build step, no dependencies to install.
