# Deuces Wild — offline / embeddable video poker

A self-contained Deuces Wild video poker game (52-card deck; all four 2s are
fully wild). It runs the original game engine and artwork with a local
JavaScript backend (`offline-server.js`) that answers every server call in the
browser, so **no server, login, or network is required**. Drop the folder onto
any static host (or into a page via `<iframe>`).

## Folder layout

```
DeucesWild/
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
cd DeucesWild
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/DeucesWild/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Press **BET ONE** / **BET MAX**, **DEAL** for five cards, tap the cards to **HOLD**,
then **DRAW** to replace the rest. Every 2 is wild and substitutes for any card.
The minimum paying hand is three of a kind.

## Win math — original

The captured `GetGameData` included the game's **own pay table**, so the win math
matches the original. Hands rank:

| Hand | 1 coin | 5 coins |
|------|-------:|--------:|
| Natural Royal Flush | 125 | 2000 |
| Four Deuces | 200 | 1000 |
| Wild (Deuces) Royal | 25 | 125 |
| Five of a Kind | 16 | 80 |
| Straight Flush | 13 | 65 |
| Four of a Kind | 4 | 20 |
| Full House | 3 | 15 |
| Flush | 2 | 10 |
| Straight | 2 | 10 |
| Three of a Kind | 1 | 5 |

`win = pay[hand][coinsBet] × coinValue`. Overridable via `window.VP_OFFLINE_CONFIG`
(`paytable`, `allowedCoinValues`, `allowedCoinValuesDisplay`, limits, balance).

## Connecting a real backend

The backend is isolated in `game/offline-server.js`. Forward
`GetGameData.aspx` / `Deal.aspx` / `Hit.aspx` inside the `$.ajax` hook and return
the same `key=value&...` format the client parses:

- **GetGameData** → the pay grid `<hand>_<coins>` (e.g. `_4D_5=1000`, `DR_5=125`),
  `minbet`, `maxbet`, `coinvalue`, `allowedcoinvalues`, `allowedcoinvaluesd`,
  `newbalance`.
- **Deal** (`coinValue`, `coinsBet`) → `c1..c5`, `result`, `gameid`, `ingame=1`.
- **Hit** (`GameId`, `R1..R5` = `Y` replace / `N` hold) → new `c1..c5`, `result`,
  `resultamt`, `newbalance`.

Cards are `1..52` (`suit = floor((n-1)/13)`, `rank = (n-1)%13`, 0 = Ace); any card
whose rank value is 2 is wild. Card images are `game/_build/img/Cards/<n>.png`.

## Notes

- Same VP_Classic_D engine as the other video-poker variants; the wild rule and
  pay table differ.
- Balance persists in `localStorage` (`vp_dw_*`); set `persist:false` for a fresh
  wallet each load. Fully static — no build step, no dependencies.
