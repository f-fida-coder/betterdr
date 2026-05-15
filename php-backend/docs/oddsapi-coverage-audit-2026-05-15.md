# OddsAPI Coverage Audit — 2026-05-15

Static analysis of how the betterdr / bettorplays247 codebase consumes The Odds API
(the-odds-api.com, v4). No code was modified. All file:line references can be opened
to verify any claim below.

> **Important env-file note**: this repo loads root `/Users/mac/Desktop/betterdr/.env`
> AFTER `php-backend/.env`, so root values win for any key set in both. Where the two
> disagree (e.g. `ODDS_TIER1_CRON_MINUTES` = 10 in `php-backend/.env` vs `1.5` in root),
> this report uses the effective root-file value.

---

## Summary Table (Top-line)

| Metric | Count | Notes |
|---|---|---|
| Sport keys OddsAPI supports (in-season + outrights, May 2026 spec) | ~40+ | core + many futures keys |
| Sport keys we **actively fetch** (tiered) | **19** | T1=8, T2=11 (+ open-ended auto-discovery T3) |
| Sport keys we **explicitly model with extended markets** | **6** + 1 default | NBA, NCAAB, NFL, NCAAF, MLB, NHL, soccer_default |
| Core markets per sport (bulk endpoint) | **3** | `h2h, spreads, totals` (env-fixed) |
| Period / alt / team-total markets we can pull (per-event endpoint, per sport) | up to **22** | NBA = 22 extended keys; soccer_default = 9 |
| Player-prop markets registered in catalog | NBA 25 · NFL 26 · MLB 32 · NHL 15 · NCAAB 8 · NCAAF 6 · soccer 8 | per-event only |
| Outrights / futures sport-keys fetched | **0** | hard-skipped at discovery [OddsSyncService.php:72-76] |
| Regions requested | **1** (`us`) | default; env-overridable |
| Bookmakers stored per match | **1** | first preferred bookmaker that has markets |
| Estimated current daily OddsAPI request volume | **~45k req/day (peak)** | dominated by 10-second live tick |
| Approx **core-coverage** vs catalog (`3/22` NBA extended + `0/25` props on bulk path) | ~14% | extended/props arrive ONLY if per-event sync runs successfully |

---

# SECTION A — Sports Coverage Gap

Legend: ✅ FETCHED · ❌ NOT FETCHED · ⚠️ PARTIAL · 🚫 OFF (explicit flag)

| Sport Key | OddsAPI Has | We Fetch | Gap / Reason |
|---|---|---|---|
| `basketball_nba` | yes | ✅ T1 | full pipeline + catalog entry |
| `basketball_wnba` | yes | ✅ T2 | core markets only — **no extended catalog entry** (OddsMarketCatalog.php) |
| `basketball_ncaab` | yes | ⚠️ auto-discover only | catalog defined but NOT in `ODDS_TIER1_SPORTS` / `ODDS_TIER2_SPORTS` |
| `basketball_euroleague` | yes | ✅ T2 | core markets only — no catalog entry |
| `americanfootball_nfl` | yes | ❌ in T1/T2 lists (root .env:44/46) but **missing from explicit tier lists** | NFL is in OddsSyncService default fallback [src/OddsSyncService.php:35] (`basketball_nba, americanfootball_nfl, soccer_epl, baseball_mlb, icehockey_nhl`); reaches it only if `ODDS_AUTO_DISCOVER_SPORTS=true` returns it or `ODDS_ALLOWED_SPORTS` is set. **Verify in prod.** |
| `americanfootball_ncaaf` | yes | ⚠️ auto-discover only | not tiered |
| `baseball_mlb` | yes | ✅ T1 | full pipeline + catalog entry |
| `icehockey_nhl` | yes | ✅ T1 | full pipeline + catalog entry |
| `soccer_epl` | yes | ✅ T1 | catalog via soccer_default |
| `soccer_uefa_champs_league` | yes | ✅ T1 | catalog via soccer_default |
| `soccer_uefa_europa_league` | yes | ❌ | not listed in either tier |
| `soccer_spain_la_liga` | yes | ✅ T1 | catalog via soccer_default |
| `soccer_germany_bundesliga` | yes | ✅ T2 | catalog via soccer_default |
| `soccer_italy_serie_a` | yes | ✅ T2 | catalog via soccer_default |
| `soccer_france_ligue_one` | yes | ✅ T2 | catalog via soccer_default |
| `soccer_usa_mls` | yes | ✅ T2 | catalog via soccer_default |
| `soccer_mexico_ligamx` | yes | ❌ | not in either tier |
| `soccer_netherlands_eredivisie` | yes | ❌ | not in either tier |
| `soccer_efl_champ` | yes | ❌ | not in either tier |
| `tennis_atp_madrid_open` | yes | ✅ T1 | core markets only — no catalog entry |
| `tennis_wta_madrid_open` | yes | ✅ T2 | core markets only — no catalog entry |
| other tennis tournaments (`tennis_atp_*`, `tennis_wta_*`) | yes | ⚠️ auto-discover only | one tournament hard-coded per tier |
| `cricket_ipl` | yes | ✅ T1 | core only |
| `cricket_odi` | yes | ✅ T2 | core only |
| `cricket_psl` | yes | ✅ T2 | core only |
| `cricket_*` (others — T20I, Test, BBL, etc.) | yes | ⚠️ auto-discover only | |
| `mma_mixed_martial_arts` | yes | ✅ T2 | core only |
| `boxing_boxing` | yes | ✅ T2 | core only |
| `aussierules_afl` | yes | ❌ | not in either tier |
| `rugbyleague_nrl` | yes | ❌ | not in either tier |
| `politics_us_presidential_election_winner` | yes | 🚫 OFF | explicit exclusion list [php-backend/.env:44] |
| **Any `*_winner` (futures / outrights)** | many keys | 🚫 OFF | OddsSyncService [src/OddsSyncService.php:72-76] excludes `has_outrights==true` sport entries during discovery |

**Auto-discovery caveat** [src/OddsSyncService.php:33]: `ODDS_AUTO_DISCOVER_SPORTS=true` calls `/v4/sports?all=false` and merges discovered sport keys into the rotation. So sports not in either tier list may still be picked up at T3 cadence if OddsAPI marks them in-season — but they will fall back to core-markets-only because there's no catalog entry.

---

# SECTION B — Markets Coverage Gap (per fetched sport)

Bulk `/v4/sports/{sport}/odds` requests are pinned to `markets=h2h,spreads,totals`
[root .env:9, src/OddsSyncService.php:301,426,740,962]. Anything else only arrives via
the per-event endpoint, gated by `ODDS_EXTENDED_SYNC_ENABLED=true` [root .env:52]
and the `OddsMarketCatalog::perEventMarkets()` definition for that sport key.

| Sport | Markets We Request (bulk) | Catalog supports (per-event) | Markets We Drop |
|---|---|---|---|
| basketball_nba | h2h, spreads, totals | + 22 extended (q1-q4, h1/h2, alt spreads/totals, team totals) + 25 props (player_points, _rebounds, _assists, _threes, _blocks, _steals, _turnovers, +combos, +double/triple-double, first basket, alternates) | none from catalog — but vs full OddsAPI surface: `player_field_goals` flavour, etc. are mostly covered. |
| basketball_ncaab | h2h, spreads, totals | + 9 extended (h1/h2, alt spreads/totals, team totals) + 8 props | bulk only — sport not in tier list so extended sync runs only if discovered |
| basketball_wnba | h2h, spreads, totals | **(no catalog entry — falls through to core only)** | All period markets, alts, team totals, player props |
| basketball_euroleague | h2h, spreads, totals | **(no catalog entry)** | All extended + props |
| americanfootball_nfl | h2h, spreads, totals | + 16 extended (q1-q4, h1/h2, alt spreads/totals, team totals) + 26 props (pass/rush/recv yds/tds/longest, kicking, sacks, tackles, anytime/first/last td, alternates) | `player_pass_rush_reception_*` is in catalog; OddsAPI also offers `player_pass_attempts_alternate`, `player_pass_completions_alternate`, `player_pass_interceptions_alternate` which we don't list |
| americanfootball_ncaaf | h2h, spreads, totals | + 16 extended + 6 props (only pass_tds/yds, rush_yds, reception_yds, receptions, anytime_td) | OddsAPI offers far more NFL-style props; we lift only 6 |
| baseball_mlb | h2h, spreads, totals | + 15 extended (h2h/spreads/totals × 1/3/5/7 innings, alt spreads/totals, team totals) + 32 props (batter & pitcher base + alternates) | per OddsAPI we also offer `batter_hits_runs_rbis_alternate`, separate batter splits — minor delta. |
| icehockey_nhl | h2h, spreads, totals | + 13 extended (p1-p3, h2h_3_way, alt spreads/totals, team totals) + 15 props (points/goals/assists/saves/shots, goal scorer first/last/anytime, alternates) | minimal — pretty good coverage of registered NHL props |
| soccer_* (any) | h2h, spreads, totals | + 9 extended (h1 markets, BTTS, BTTS h1, DNB, double chance, alt spreads/totals, team totals) + 8 props | OddsAPI also offers correct_score, total_corners, total_cards, exact_goals, half-time/full-time market, win-to-nil — none in catalog |
| cricket_* | h2h, spreads, totals | none | All extended/prop markets dropped (OddsAPI carries top batter, total sixes, etc. for some markets) |
| tennis_* | h2h, spreads, totals | none | OddsAPI tennis has set/game markets — dropped |
| mma / boxing | h2h, spreads, totals | none | method_of_victory, round_betting, etc. — dropped |

**Drop summary**: every sport without a `OddsMarketCatalog` entry receives **core markets
only** even when `ODDS_EXTENDED_SYNC_ENABLED=true` — `extendedMarkets($sportKey)` returns
`[]` [src/OddsMarketCatalog.php:160-167].

---

# SECTION C — Futures / Outrights Gap

| OddsAPI outright key (May 2026 spec) | We Fetch? | Where Used |
|---|---|---|
| `basketball_nba_championship_winner` | ❌ | never — excluded by discovery filter |
| `basketball_nba_eastern_conference_winner` | ❌ | |
| `basketball_nba_western_conference_winner` | ❌ | |
| `baseball_mlb_world_series_winner` (+ AL/NL) | ❌ | |
| `icehockey_nhl_championship_winner` | ❌ | |
| `americanfootball_nfl_super_bowl_winner` | ❌ | |
| `soccer_epl_winner` / `soccer_uefa_champs_league_winner` etc. | ❌ | |
| **All other `*_winner` keys** | ❌ | |

Root cause [src/OddsSyncService.php:72-76]: during sport discovery we skip any entry
where `has_outrights === true`. The codebase has **no `outrights` market handling
anywhere** — not in OddsSyncService, OddsMarketCatalog, MatchesController, or the frontend.

Outrights are an entire product category we are not selling.

---

# SECTION D — Player Props Gap (catalog vs OddsAPI universe)

Catalog only includes player props for **6 sports** (NBA, NCAAB, NFL, NCAAF, MLB, NHL)
plus a shared soccer_default. Even then, props only land if:
1. `ODDS_EXTENDED_SYNC_ENABLED=true` (root .env:52 = true; php-backend/.env:48 = false — root wins)
2. The match is active (status=scheduled/live) [src/OddsSyncService.php:1336]
3. Per-event TTL `lastPropsSyncAt` is older than `EVENT_PROPS_TTL_SECONDS` (≈5 min)
4. Tier permits — `ODDS_TIER3_EXTENDED_SYNC` gates auto-discovered T3 sports

| Sport | Props in catalog | Approx OddsAPI offering | Coverage |
|---|---|---|---|
| NBA | 25 | ~28 | **~90%** — strong |
| NFL | 26 | ~35+ | ~70–75% — alt variants of pass_completions/attempts/interceptions missing |
| MLB | 32 | ~35 | ~90% — strong |
| NHL | 15 | ~18 | ~80% |
| NCAAB | 8 | ~15 | ~50% |
| NCAAF | 6 | ~15 | ~40% |
| Soccer (any league) | 8 | ~15+ | ~50% (no goalkeeper saves, no corner-takers, no specific-time-of-goal) |
| WNBA | **0** | ~15 | **0%** (no catalog entry) |
| Euroleague | **0** | ~10 | **0%** |
| Cricket / Tennis / MMA / Boxing | **0** | varies (cricket has top-batter, tennis has set/game) | **0%** |

The per-event endpoint chunks ≤10 markets per call [reported by cron-quota agent]; for
NBA the per-event cost is roughly `ceil((3 core + 22 extended + 25 props) / 10) ≈ 5 calls/event` 
per refresh cycle.

---

# SECTION E — Bookmaker / Region Gap

**Regions**
- Configured: `us` only (env `ODDS_API_REGIONS` default; verified at src/OddsSyncService.php:300,425,739,961,1227).
- Available on OddsAPI: `us`, `us2`, `uk`, `eu`, `au`.
- Gap: We pass through whatever `ODDS_API_REGIONS` is set to verbatim — single-region right now. Adding `us2` would unlock more US books on player props; `uk`/`eu` would add Bet365/Pinnacle/Unibet odds for international users.

**Bookmakers**
- API-side filter: `ODDS_API_BOOKMAKERS` env var, **empty by default** [src/OddsSyncService.php:303,428,742,964,1229] → "return all books in region".
- Application-side preference list: `ODDS_PREFERRED_BOOKMAKERS = draftkings,fanduel,betmgm,caesars,pinnacle` [root .env:10].
- Selection logic [src/OddsSyncService.php:1487-1559]: iterate the preferred list; pick the **first** bookmaker that exists in the API response AND has at least one market with outcomes. Fall back to first non-empty bookmaker if none of the preferred match. **All other bookmakers' odds are discarded.**
- **Bookmaker key dropped**: `bookmakers[].key` is read at line 1508-1525 to do the lookup but never persisted; only `bookmakers[].title` is stored (`odds.bookmaker = "DraftKings"`). Downstream UI can show the book name but cannot programmatically filter by it without a string→key map.

**Gap**: we are effectively a single-book sportsbook display. No best-price-across-books, no line shopping, no consensus line / sharp vs square. We pay OddsAPI for many books but throw all but one away in ingest.

---

# SECTION F — Response Field Drop Analysis

OddsAPI `/odds` response shape:
```
[{
  id, sport_key, sport_title, commence_time, home_team, away_team,
  bookmakers: [{ key, title, last_update,
    markets: [{ key, last_update,
      outcomes: [{ name, price, point, description }]
    }]
  }]
}]
```

| OddsAPI Field | Stored In | Used By | Dropped? |
|---|---|---|---|
| `id` | `matches.doc.externalId` (indexed) [src/OddsSyncService.php:1572] | upsert / lookup | no |
| `sport_key` | `matches.doc.sportKey` (indexed) [:1581] | tier rotation, controller filter | no |
| `sport_title` | `matches.doc.sport` [:1580] | UI label | no |
| `commence_time` | `matches.doc.startTime` [:1579] | scheduling, UI | no |
| `home_team` | `matches.doc.homeTeam` [:1573] | UI, score matching | no |
| `away_team` | `matches.doc.awayTeam` [:1574] | UI, score matching | no |
| `bookmakers[].key` | — | only used in selection [src/OddsSyncService.php:1508-1525] | **DROPPED after selection** |
| `bookmakers[].title` | `matches.doc.odds.bookmaker` [:1522,1530] | UI ("Powered by …") | no (but only one preserved) |
| `bookmakers[].last_update` | — | never read | **DROPPED** — per-book staleness lost |
| All non-selected bookmakers | — | — | **DROPPED entirely** |
| `markets[].key` | preserved in `matches.doc.odds.markets[]` and `odds.extendedMarkets[]` | UI rendering | no |
| `markets[].last_update` | — | never read | **DROPPED** — per-market staleness lost |
| `outcomes[].name` | preserved in markets array | UI, settlement | no |
| `outcomes[].price` | preserved | UI, settlement | no |
| `outcomes[].point` | preserved | UI (spread/total line) | no |
| `outcomes[].description` (player name for props) | preserved when prop fetched | UI prop labels | no — but ONLY for sports/markets in catalog |

`/scores` endpoint:

| Field | Stored | Dropped? |
|---|---|---|
| `id`, `sport_key`, `sport_title`, `commence_time`, `home_team`, `away_team` | mapped same as odds | no |
| `completed` | folded into `matches.doc.status` ∈ {scheduled,live,finished} [:1951-1956] | yes — boolean is collapsed |
| `scores[].name` | used to align which score is home vs away [:1926-1930] | not stored — only used for matching |
| `scores[].score` | `matches.doc.score.score_home`, `.score_away` [:1927,1930,1936,1937] | no |
| `last_update` | — | **DROPPED** — only our internal `lastScoreSyncAt` is stored |

Synthetic / derived stored fields (not from OddsAPI):
- `homeTeamShort`, `awayTeamShort` — TeamNormalizer output [:1577]
- `oddsSource` — `'oddsapi'` or `'rundown'` [:1583]
- `status`, `score.period`, `score.event_status` — computed [:1940-1956]
- Timestamps: `lastUpdated`, `lastOddsSyncAt`, `lastScoreSyncAt`, `lastPropsSyncAt`, `updatedAt`, `createdAt`

**Valuable drops worth calling out:**
1. **All non-primary bookmakers' odds** — line-shopping product not possible
2. **`bookmakers[].key`** — UI cannot filter by book without a reverse map
3. **`markets[].last_update`** — can't show "this line moved 12s ago" per market
4. **`outright` markets** — never reached (filtered at discovery, no parser path)

---

# SECTION G — Cron / Quota Analysis

Worker entry: [scripts/odds-worker.php]. Inner loop ticks the live sync sub-interval
(`RUNDOWN_LIVE_TICK_SECONDS`) repeatedly between outer tier cycles.

| Job | Sport scope | Markets | Effective Interval | Est. Requests/Day |
|---|---|---|---|---|
| Tier-1 bulk `/odds` | 8 sports (NBA, IPL, EPL, UCL, La Liga, MLB, NHL, ATP Madrid) | h2h,spreads,totals | 1.5 min (root `ODDS_TIER1_CRON_MINUTES`) | 8 × (60/1.5) × 24 = **7,680** |
| Tier-1 `/scores` | same 8 | n/a | 1.5 min | **7,680** |
| Tier-2 bulk `/odds` | 11 sports | h2h,spreads,totals | 1.5 min (root) | 11 × 960 ≈ **10,560** |
| Tier-2 `/scores` | same 11 | n/a | 1.5 min | **10,560** |
| Tier-3 (auto-discovered) | varies | h2h,spreads,totals | depends on `ODDS_TIER3_CRON_MINUTES` (10) → ~144 calls/sport/day | small |
| Per-event extended/props | active matches, sports with catalog entries | up to 47 markets chunked ≤10/call | 5-min per-event TTL (`lastPropsSyncAt`) | ~30 active matches × 5 calls × (60/5×24) = **~21,600/day** (when ext sync enabled) |
| `/v4/sports` discovery | n/a | n/a | cached 1h | **24** |
| Live tick (OddsAPI live path, `LIVE_ODDS_ODDSAPI=true`) | live sports only | core | 70s inner tick × N live sports × 2 (odds + scores) | varies; e.g. 5 live sports × 2 × (3600/70) × 24 ≈ **12,300** |
| Manual refresh endpoints | per user | core | rate-limited | bounded; not material |

**Total daily estimate: ~45,000 – 70,000 OddsAPI requests/day** during peak season,
heavily dominated by the live tick and per-event sync.

**Headroom flags worth highlighting (note only, per scope):**
- `ODDS_SYNC_MAX_CALLS_PER_MINUTE=30` [root .env:56] enforces a 30/min in-process
  guard. The live tick can burst above this during many simultaneous live games —
  request bursts that exceed the guard get queued/dropped depending on path.
- OddsAPI response headers `x-requests-remaining` / `x-requests-used` are parsed
  and logged [reported per cron-quota agent] but **not used as a backoff signal**.
- `RUNDOWN_LIVE_ENABLED=false` [root .env:19] means we are NOT offloading live to
  Rundown right now — every live event hits OddsAPI directly.

---

# SECTION H — Storage / Pipeline Gap (drops per stage)

```
OddsAPI                                          field count: many
    │
    ▼
STAGE 1 — Ingestion (OddsSyncService)            DROPS:
    │                                            • Outright sports (discovery filter L72-76)
    │                                            • Markets ≠ {h2h,spreads,totals} on BULK path
    │                                            • All but one bookmaker per match (L1487-1559)
    │                                            • bookmakers[].key (selection-only)
    │                                            • bookmakers[].last_update
    │                                            • markets[].last_update
    │                                            • outcomes[].* preserved (raw market obj kept)
    │                                            • For sports w/o OddsMarketCatalog entry, even
    │                                              with ODDS_EXTENDED_SYNC_ENABLED=true: no
    │                                              extended sync runs (catalog returns []).
    ▼
STAGE 2 — Storage (matches.doc JSON column)      DROPS:
    │                                            • No separate odds_* / extended_markets /
    │                                              player_props tables — all in one JSON blob
    │                                            • Schema only enforces externalId, sport,
    │                                              sportKey, startTime, status indexes
    │                                              [scripts/add-mysql-indexes.php]
    │                                            • extendedMarkets is preserved across bulk
    │                                              re-sync (won't be wiped) but only updates
    │                                              when per-event sync runs (~5-min TTL)
    ▼
STAGE 3 — API projection (MatchesController)     DROPS:
    │                                            • payload=core mode strips `playerProps`
    │                                              [src/MatchesController.php:200-226, 366]
    │                                            • Public-visibility filter hides matches
    │                                              [L236-238, 286-335]
    │                                            • Freshness filter: matches with
    │                                              lastOddsSyncAt older than
    │                                              PREMATCH_FRESHNESS_SECONDS (~300s) are
    │                                              dropped (not flagged stale)
    │                                            • /api/matches list response = core projection
    │                                              by default. Detail / props live at
    │                                              /api/matches/{id} and /api/matches/{id}/props
    ▼
STAGE 4 — Frontend rendering                     DROPS:
    │                                            • [frontend/src/utils/odds.js:129-132]
                                                   merges odds.markets + odds.extendedMarkets
                                                   into one pool
                                                 • [MobileContentView.jsx:398-399]
                                                   PERIOD_MARKET_RE = /^(h2h|spreads|totals)
                                                   (_[a-z0-9_]+)?$/ — any market key NOT
                                                   matching this regex is silently filtered
                                                   from period tabs:
                                                     - alternate_spreads, alternate_totals
                                                     - team_totals, alternate_team_totals
                                                     - btts, btts_h1, draw_no_bet, double_chance
                                                     - all player_*, batter_*, pitcher_* (props)
                                                 • SportContentView.jsx:553-555 only reads
                                                   h2h / spreads / totals on the list view
                                                 • MatchDetailView.jsx:60-64 has separate
                                                   handlers for alternate_*/team_totals + a
                                                   props panel (lazy fetched)
                                                 • Soccer specials (correct_score, total_corners,
                                                   total_cards) — never rendered because never
                                                   in catalog or in BTTS-compatible UI tab
```

Net effect: even with `ODDS_EXTENDED_SYNC_ENABLED=true` and a catalog entry, the **list
view UI only ever renders `^(h2h|spreads|totals)(_…)?$`** market keys; alternates / team
totals / props are only surfaced on the per-match detail view, which has to make a
separate lazy fetch.

---

# SECTION I — Quick Wins (impact-to-effort ranked)

Each row identifies a change that does NOT require new infrastructure — just toggling
a flag, adding a market to an already-fetched sport's catalog, persisting a field that
is already in the OddsAPI response, or rendering a field that is already in our API.

| # | Quick win | Effort | Impact | Where |
|---|---|---|---|---|
| 1 | Add `OddsMarketCatalog` entries for `basketball_wnba` and `basketball_euroleague` (extended + props). They're already tier-fetched and active; adding entries lights up period markets + props with zero new infra. | XS (config) | High — two whole leagues go from 3 markets → 20+ | [src/OddsMarketCatalog.php:46] |
| 2 | Add `americanfootball_nfl`, `americanfootball_ncaaf`, `basketball_ncaab` to `ODDS_TIER1_SPORTS` (or T2). They have catalog entries but aren't in either tier list, so extended sync only runs if auto-discovery surfaces them this cycle. | XS (env edit) | High — guarantees NFL/NCAAB/NCAAF period & props sync | [root .env:44,46] |
| 3 | Persist `bookmakers[].key` (not just `.title`) into `matches.doc.odds.bookmakerKey`. Tiny ingest tweak. Unlocks future UI book-filtering and analytics without re-fetching. | S | Medium | [src/OddsSyncService.php:1508-1530] |
| 4 | Add `us2` to `ODDS_API_REGIONS` (currently `us` only). Unlocks more US book inventory for player props (especially MGM, Caesars variants). Header-budget impact is moderate. | XS (env edit) | Medium — better prop fill rate | [src/OddsSyncService.php:300] |
| 5 | Frontend: render `alternate_spreads` / `alternate_totals` / `team_totals` on the **list/period tabs** (not just MatchDetailView). The data is already in `match.odds.extendedMarkets` when catalog runs — relax `PERIOD_MARKET_RE` or add a parallel renderer. | S | Medium-high — gives users more pickable lines on main view | [frontend/src/components/MobileContentView.jsx:398-399] |
| 6 | Add soccer specials to soccer_default catalog: `correct_score`, `total_corners`, `total_cards` — high-engagement soccer props that OddsAPI already returns. | XS (config) | Medium for soccer-heavy days | [src/OddsMarketCatalog.php:140-152] |
| 7 | Surface `markets[].last_update` from OddsAPI in `matches.doc.odds.markets[].lastUpdate` and let UI render "moved Ns ago" badges. Already in the response. | S | Low-medium — feels sharper | [src/OddsSyncService.php] mapping step |
| 8 | Add tier entries for `soccer_uefa_europa_league`, `soccer_mexico_ligamx`, `soccer_efl_champ` — popular leagues we are currently missing. All inherit `soccer_default` catalog so they get props automatically. | XS | Medium | [root .env:44,46] |
| 9 | Implement a separate "outrights" pull. The codebase has no outright path at all today; this is real new work but it's an entire un-monetised product (Super Bowl, World Series, conference winners). Calling it "quick" is generous, but a stripped MVP (one-shot daily refresh of championship_winner markets, store in `matches` with `kind='outright'`) is feasible. | M | High strategic | new code path in OddsSyncService |
| 10 | Remove the `payload=core` strip of `playerProps` for list responses for matches that are within 1 hour of tipoff. Frontend will then have props already on the list view without an extra round-trip. (Watch payload size.) | S | Low-medium — better TTFB on detail open | [src/MatchesController.php:200-226, L366] |

---

## Bugs / Anomalies Noted In Passing (per scope: no code changes)

1. **Dual-env disagreement is large**. `php-backend/.env` has `ODDS_TIER1_CRON_MINUTES=10`, `ODDS_TIER2_CRON_MINUTES=15`, `ODDS_EXTENDED_SYNC_ENABLED=false`, `ODDS_SYNC_MAX_CALLS_PER_MINUTE=3`. Root `.env` overrides to `1.5/1.5/true/30`. The intent is presumably the root values, but anyone reading only `php-backend/.env` will get a wrong picture of cadence/budget. (See [feedback memory: project_dual_env_files].)
2. **NFL not in either tier list.** Default fallback at [src/OddsSyncService.php:35] includes NFL, but the env-tiered path may or may not include it depending on whether the fallback applies when `ODDS_TIER1_SPORTS` is non-empty. Worth verifying in production with a single grep through worker logs.
3. **Live tick + 30/min guard**. With many live games the live path can burst past 30 calls/min; the guard quietly suppresses calls, which would manifest as stale live odds rather than an error.
4. **No proactive backoff on `x-requests-remaining`** — only a 5xx/timeout-driven circuit breaker.

These are reported, not fixed, per instructions.

---

## Verifiability Anchors

Key files and line ranges underpinning this audit:
- [src/OddsSyncService.php:33,35,72-76,300-306,425-431,738-742,961-964,1227-1252,1336,1487-1559,1566-1591,1926-1956,2006-2007]
- [src/OddsMarketCatalog.php:15,17-153,160-167,174-181,189-196]
- [src/MatchesController.php:175-430,200-226,236-238,252-395,366,443-448]
- [scripts/odds-worker.php:73-74,194-241]
- [scripts/add-mysql-indexes.php] (matches table indices)
- [frontend/src/utils/odds.js:129-132]
- [frontend/src/components/MobileContentView.jsx:289-349,398-399,613-614,637-638,826-828]
- [frontend/src/components/SportContentView.jsx:553-555]
- [frontend/src/components/MatchDetailView.jsx:60-64]
- [root .env:9-10,19,44-56,102,120]
- [php-backend/.env:9,13,27-30,43-44,48,112,144,167]

End of audit.
