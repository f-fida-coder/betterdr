# Video Keno — offline / embeddable

A self-contained 80-ball Video Keno game. It runs the original game engine and
artwork with a local JavaScript backend (`offline-server.js`) that answers every
server call in the browser, so **no server, login, or network is required**.
Drop the folder onto any static host (or into a page via `<iframe>`).

## Folder layout

```
VideoKeno/
├── index.html              ← launcher (open this)
├── README.md
├── game/                   ← the game
│   ├── index.html
│   ├── GetLangXml.xml      ← translations (served locally)
│   ├── LoaderConfig.json
│   ├── css/  fonts/  images/  sounds/
│   └── js/
│       ├── vkeno.js …      ← original engine
│       └── offline-server.js   ← the local backend (the only added file)
└── common/                 ← shared libs (jquery, jquery-ui, audio…)
```

## Run locally

```bash
cd VideoKeno
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

## Embed in your own site

```html
<iframe src="/VideoKeno/index.html"
        style="border:0;width:100%;height:100%" allowfullscreen></iframe>
```

## How to play

Pick 2–10 numbers on the 1–80 board (or use AUTO PICK / PICK 5 / PICK 10),
choose a coin value and number of coins, then press **GO**. Twenty balls are
drawn; you're paid by how many of your numbers were hit, per the pay table.

## Win math — original

The captured `Recover` response included the game's **own pay table (`Payouts`)**,
so the win math matches the original: payout is looked up by (spots picked, hits),
and `win = pay × coin value × coins bet`. Overall RTP ≈ 90% across all spot
counts. Everything is overridable via `window.KENO_OFFLINE_CONFIG`.

## Configuration

```js
window.KENO_OFFLINE_CONFIG = {
  startBalance: 2000,
  minSpots: 2, maxSpots: 10,
  minBet: 0.10, maxBet: 5.00,
  coinValues: [0.10, 0.50, 1.00],
  // "spots,hits,pay;…" — override to change the pay table
  payoutsStr: '10,10,9000.00;10,9,900.00;...;2,2,15.00',
  persist: true
};
```

Runtime helpers on `window.KenoOffline`:

```js
KenoOffline.getBalance();
KenoOffline.resetBalance(2000);
```

## Connecting a real backend

The backend is isolated in `game/js/offline-server.js`. To settle against your own
server, forward `Recover.aspx` / `Spin.aspx` inside the `$.ajax` hook and return
the same `key=value&...` format the client parses:

- **Recover** → `Balance`, `MinBet`, `MaxBet`, `MinSpots`, `MaxSpots`,
  `CoinValues`, `CoinValuesD`, `NumCoins`, `Payouts` (the pay table), `iserr=0`.
- **Spin** (`CoinValue`, `CoinsBet`, `Ticket=n,n,n`) → `BallsDrawn` (20 comma-
  separated numbers 1–80), `ResultAmt` (win), `Balance`, `GameId`, `iserr=0`.

Total bet = `CoinValue × CoinsBet`; win = `Payouts[spots][hits] × CoinValue × CoinsBet`.

## Notes

- Balance persists in `localStorage` (`keno_offline_*`); set `persist:false` for a
  fresh wallet each load.
- Fully static — no build step, no dependencies.
