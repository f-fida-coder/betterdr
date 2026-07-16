# Double Bonus Poker — offline / embeddable video poker

A self-contained Double Bonus Poker game (52-card deck, no wild). It runs the
original game engine and artwork with a local JavaScript backend
(`offline-server.js`) that answers every server call in the browser, so **no
server, login, or network is required**. Drop the folder onto any static host
(or into a page via `<iframe>`).

## Folder layout

```
DoubleBonus/
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
cd DoubleBonus
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/DoubleBonus/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Press **BET ONE** / **BET MAX**, **DEAL** for five cards, tap the cards to **HOLD**,
then **DRAW** to replace the rest. You're paid for the final hand per the pay
table. Double Bonus rewards four-of-a-kinds with three tiers.

## Win math — original

The captured `GetGameData` included the game's **own pay table**, so the win math
matches the original. Minimum paying hand is Jacks or Better; hands rank:

| Hand | 1 coin | 5 coins |
|------|-------:|--------:|
| Natural Royal Flush | 125 | 2000 |
| Four Aces | 160 | 800 |
| Four 2s / 3s / 4s | 80 | 400 |
| Four 5s – Kings | 50 | 250 |
| Straight Flush | 50 | 250 |
| Full House | 9 | 45 |
| Flush | 6 | 30 |
| Straight | 4 | 20 |
| Three of a Kind | 3 | 15 |
| Two Pair | 1 | 5 |
| Jacks or Better | 1 | 5 |

`win = pay[hand][coinsBet] × coinValue`. Overridable via `window.VP_OFFLINE_CONFIG`
(`paytable`, `allowedCoinValues`, `allowedCoinValuesDisplay`, limits, balance).

## Connecting a real backend

The backend is isolated in `game/offline-server.js`. Forward
`GetGameData.aspx` / `Deal.aspx` / `Hit.aspx` inside the `$.ajax` hook and return
the same `key=value&...` format the client parses:

- **GetGameData** → the pay grid `<hand>_<coins>` (e.g. `_4A_5=800`), `minbet`,
  `maxbet`, `coinvalue`, `allowedcoinvalues`, `allowedcoinvaluesd`, `newbalance`.
- **Deal** (`coinValue`, `coinsBet`) → `c1..c5`, `result`, `gameid`, `ingame=1`.
- **Hit** (`GameId`, `R1..R5` = `Y` replace / `N` hold) → new `c1..c5`, `result`,
  `resultamt`, `newbalance`.

Cards are `1..52` (`suit = floor((n-1)/13)`, `rank = (n-1)%13`, 0 = Ace). Card
images are `game/_build/img/Cards/<n>.png`.

## Notes

- Same VP_Classic_D engine as the other video-poker variants; only the pay table
  and hand evaluation differ.
- Balance persists in `localStorage` (`vp_db_*`); set `persist:false` for a fresh
  wallet each load. Fully static — no build step, no dependencies.
