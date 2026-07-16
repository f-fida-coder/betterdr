# Jokers Wild — offline / embeddable video poker

A self-contained Jokers Wild video poker game (53-card deck with a fully-wild
joker). It runs the original game engine and artwork with a local JavaScript
backend (`offline-server.js`) that answers every server call in the browser, so
**no server, login, or network is required**. Drop the folder onto any static
host (or into a page via `<iframe>`).

## Folder layout

```
VideoPokerJW/
├── index.html              ← launcher (open this)
├── README.md
├── GetLangXml.xml          ← translations (served locally)
├── game/                   ← the game
│   ├── index.html
│   ├── offline-server.js   ← the local backend (the only added file)
│   └── _build/             ← original engine, styles, images (Cards/…), sounds
└── common/                 ← shared libs (jquery, soundjs, preloadjs…)
```

## Run locally

```bash
cd VideoPokerJW
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/VideoPokerJW/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Press **BET ONE** / **BET MAX** to set the wager, **DEAL** for five cards, tap the
cards you want to **HOLD**, then **DRAW** to replace the rest. You're paid for the
final hand per the pay table. The joker is fully wild.

## Win math — original

The captured `GetGameData` included the game's **own pay table**, so the win math
matches the original. Minimum paying hand is Kings or Better; hands rank:

| Hand | 1 coin | 5 coins |
|------|-------:|--------:|
| Natural Royal Flush | 125 | 2000 |
| Five of a Kind | 200 | 1000 |
| Joker (Wild) Royal | 100 | 500 |
| Straight Flush | 50 | 250 |
| Four of a Kind | 20 | 100 |
| Full House | 6 | 30 |
| Flush | 4 | 20 |
| Straight | 3 | 15 |
| Three of a Kind | 2 | 10 |
| Two Pair | 1 | 5 |
| Kings or Better | 1 | 5 |

`win = pay[hand][coinsBet] × coinValue`. Everything is overridable via
`window.VP_OFFLINE_CONFIG`.

## Configuration

```js
window.VP_OFFLINE_CONFIG = {
  startBalance: 2000,
  minBet: 0.25, maxBet: 25,
  allowedCoinValues: [0.25, 0.50, 1.00, 2.00, 5.00],
  paytable: {                     // pay per hand for 1..5 coins
    KB:[1,2,3,4,5], _2P:[1,2,3,4,5], _3K:[2,4,6,8,10], ST:[3,6,9,12,15],
    FL:[4,8,12,16,20], FH:[6,12,18,24,30], _4K:[20,40,60,80,100],
    SF:[50,100,150,200,250], JR:[100,200,300,400,500],
    NR:[125,250,375,500,2000], _5K:[200,400,600,800,1000]
  },
  persist: true
};
```

Runtime helpers on `window.VpOffline`:

```js
VpOffline.getBalance();
VpOffline.resetBalance(2000);
```

## Connecting a real backend

The backend is isolated in `game/offline-server.js`. To settle against
your own server, forward `GetGameData.aspx` / `Deal.aspx` / `Hit.aspx` inside the
`$.ajax` hook and return the same `key=value&...` format the client parses:

- **GetGameData** → the pay grid `<hand>_<coins>` (e.g. `_4K_5=100`), `minbet`,
  `maxbet`, `coinvalue`, `allowedcoinvalues`, `newbalance`, `iserr=0`.
- **Deal** (`coinValue`, `coinsBet`) → `c1..c5` (five cards), `h1..h7`, `result`,
  `gameid`, `ingame=1`.
- **Hit** (`GameId`, `R1..R5` = `Y` replace / `N` hold) → new `c1..c5`, `result`,
  `resultamt` (win), `newbalance`.

Cards are `1..52` (`suit = floor((n-1)/13)`, `rank = (n-1)%13`, 0 = Ace);
`53` = joker (wild). Card images are `VP_Classic_D/_build/img/Cards/<n>.png`.

## Notes

- This is one of a family of video-poker variants on the same engine (Jacks or
  Better, Deuces Wild, Double Bonus, Aces & Eights, …) — only the pay table and
  the wild/eval rules differ, so they build the same way.
- Balance persists in `localStorage` (`vp_jw_*`); set `persist:false` for a fresh
  wallet each load. Fully static — no build step, no dependencies.
