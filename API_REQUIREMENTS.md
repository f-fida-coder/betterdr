# Sports Betting Platform - API Requirements

## 1. AUTHENTICATION & USER MANAGEMENT
### 1.1 User Registration
- **POST** `/api/auth/register`
  - Request: `{ username, password, email, firstName, lastName, dateOfBirth }`
  - Response: `{ userId, token, userProfile }`
  - Purpose: Register new user account

### 1.2 User Login
- **POST** `/api/auth/login`
  - Request: `{ username, password }`
  - Response: `{ userId, token, username, balance }`
  - Purpose: Authenticate user and return session token

### 1.3 User Logout
- **POST** `/api/auth/logout`
  - Request: `{ userId, token }`
  - Response: `{ success: boolean }`
  - Purpose: End user session

### 1.4 Get User Profile
- **GET** `/api/users/{userId}`
  - Response: `{ userId, username, email, balance, pendingBalance, accountStatus, createdAt }`
  - Purpose: Retrieve complete user profile information

### 1.5 Update User Profile
- **PUT** `/api/users/{userId}`
  - Request: `{ email, firstName, lastName, phone, address, city, state, zip }`
  - Response: `{ success: boolean, updatedProfile }`
  - Purpose: Update user account details

### 1.6 Change Password
- **POST** `/api/auth/change-password`
  - Request: `{ userId, currentPassword, newPassword }`
  - Response: `{ success: boolean }`
  - Purpose: Change user password

---

## 2. ACCOUNT & BALANCE MANAGEMENT
### 2.1 Get Account Balance
- **GET** `/api/account/balance`
  - Response: `{ currentBalance, pendingBalance, totalWinnings, totalLosses }`
  - Purpose: Get real-time user balance and account summary

### 2.2 Deposit Funds
- **POST** `/api/account/deposit`
  - Request: `{ userId, amount, paymentMethod, paymentDetails }`
  - Payment Methods: `bitcoin, litecoin, visa, mastercard, apple-pay, bank-transfer`
  - Response: `{ transactionId, status, amount, method, timestamp }`
  - Purpose: Process deposit transaction

### 2.3 Withdraw Funds
- **POST** `/api/account/withdraw`
  - Request: `{ userId, amount, paymentMethod, bankDetails/walletAddress }`
  - Response: `{ transactionId, status, amount, method, processingTime }`
  - Purpose: Process withdrawal request

### 2.4 Get Transaction History
- **GET** `/api/account/transactions?limit=50&offset=0`
  - Response: `{ transactions: [{ id, type, amount, method, status, date }] }`
  - Purpose: Retrieve user's deposit/withdrawal history

### 2.5 Get Betting History
- **GET** `/api/account/bets?limit=50&offset=0`
  - Response: `{ bets: [{ id, type, wager, odds, result, winnings, date }] }`
  - Purpose: Retrieve user's betting history

---

## 3. SPORTS BETTING APIs
### 3.1 Get Available Sports
- **GET** `/api/sports`
  - Response: 
    ```json
    {
      "sports": [
        {
          "id": "football",
          "label": "FOOTBALL",
          "icon": "fa-solid fa-football",
          "leagues": ["nfl", "ncaa-football"]
        },
        { "id": "basketball", "label": "BASKETBALL", "leagues": ["nba", "ncaa-basketball"] },
        { "id": "baseball", "label": "BASEBALL", "leagues": ["mlb", "minors"] },
        { "id": "hockey", "label": "HOCKEY", "leagues": ["nhl"] },
        { "id": "soccer", "label": "SOCCER", "leagues": ["epl", "la-liga", "serie-a"] },
        { "id": "horse-racing", "label": "HORSE RACING", "leagues": ["thoroughbred", "harness"] }
      ]
    }
    ```
  - Purpose: Get list of all available sports and leagues

### 3.2 Get Live Matches
- **GET** `/api/matches/live?sport={sportId}&league={leagueId}`
  - Response:
    ```json
    {
      "matches": [
        {
          "id": 1,
          "sport": "football",
          "league": "nfl",
          "team1": "L.A. LAKERS",
          "team2": "G.S. WARRIORS",
          "score1": 112,
          "score2": 108,
          "status": "Q4 2:30",
          "isLive": true,
          "timestamp": "2026-01-13T15:30:00Z"
        }
      ]
    }
    ```
  - Purpose: Get all live/in-progress matches

### 3.3 Get Upcoming Matches
- **GET** `/api/matches/upcoming?sport={sportId}&league={leagueId}&days=7`
  - Response: Same as 3.2 but with `isLive: false`, `scheduledTime`, and `status: "PRE-GAME"`
  - Purpose: Get upcoming matches scheduled for future dates

### 3.4 Get Match Details
- **GET** `/api/matches/{matchId}`
  - Response:
    ```json
    {
      "id": 1,
      "team1": { "name": "L.A. LAKERS", "logo": "url", "record": "15-4" },
      "team2": { "name": "G.S. WARRIORS", "logo": "url", "record": "12-6" },
      "status": "Q4 2:30",
      "score": { "team1": 112, "team2": 108 },
      "venue": "Crypto.com Arena",
      "stats": { "team1": {...}, "team2": {...} },
      "availableOdds": [...]
    }
    ```
  - Purpose: Get detailed information about a specific match

### 3.5 Get Odds for Match
- **GET** `/api/odds/{matchId}`
  - Response:
    ```json
    {
      "matchId": 1,
      "lastUpdated": "2026-01-13T15:25:00Z",
      "odds": [
        {
          "id": "spread",
          "label": "SPREAD -5.5",
          "team1": -110,
          "team2": -110,
          "line": -5.5
        },
        {
          "id": "moneyline",
          "label": "MONEYLINE",
          "team1": -220,
          "team2": +180
        },
        {
          "id": "total",
          "label": "TOTAL 228.5",
          "over": -110,
          "under": -110,
          "line": 228.5
        }
      ]
    }
    ```
  - Purpose: Get real-time odds for a match

### 3.6 Get Featured Matches
- **GET** `/api/matches/featured`
  - Response: Array of featured/promoted matches
  - Purpose: Get promoted matches for homepage display

### 3.7 Get UP NEXT Matches
- **GET** `/api/matches/up-next?limit=10`
  - Response: Array of upcoming matches starting soon
  - Purpose: Get matches starting within next few hours

---

## 4. PLAYER PROPS APIs
### 4.1 Get Player Props
- **GET** `/api/props?matchId={matchId}&sport={sport}`
  - Response:
    ```json
    {
      "props": [
        {
          "id": "prop-1",
          "player": "Travis Etienne Jr.",
          "team": "BUF @ JAX",
          "eventType": "To Score a Touchdown",
          "odds": [
            { "outcome": "Yes", "odds": +809 },
            { "outcome": "No", "odds": -1000 }
          ]
        },
        {
          "id": "prop-2",
          "player": "James Cook",
          "stat": "79½ Over - Total Rushing Yards",
          "odds": [
            { "outcome": "Over", "odds": +1162 },
            { "outcome": "Under", "odds": -1420 }
          ]
        }
      ]
    }
    ```
  - Purpose: Get player prop betting options

### 4.2 Get Promo Parlays (SGP - Same Game Parlay)
- **GET** `/api/promos/same-game-parlays?matchId={matchId}`
  - Response:
    ```json
    {
      "promos": [
        {
          "id": "sgp-1",
          "title": "Leaders In The Clubhouse",
          "time": "Today 11:00 PM",
          "badge": "WA SGP",
          "players": [
            { "name": "Travis Etienne Jr.", "event": "Yes - To Score a Touchdown", "odds": +809 },
            { "name": "Christian McCaffrey", "event": "Yes - To Score a Touchdown" }
          ],
          "combinedOdds": "+809 » +833"
        }
      ]
    }
    ```
  - Purpose: Get pre-made parlay combinations for promotion

### 4.3 Get Horse Racing Props
- **GET** `/api/props/horse-racing?trackId={trackId}`
  - Response: Horse racing specific props and odds
  - Purpose: Get horse racing betting options

---

## 5. BETTING APIs
### 5.1 Place Bet
- **POST** `/api/bets/place`
  - Request:
    ```json
    {
      "userId": "user-123",
      "betType": "straight", // straight, parlay, if-bet, teaser, please-bet
      "selections": [
        {
          "matchId": 1,
          "oddsId": "moneyline",
          "selection": "team1",
          "odds": -220
        },
        {
          "matchId": 2,
          "oddsId": "spread",
          "selection": "team2",
          "odds": -110
        }
      ],
      "wager": 100,
      "potentialWinning": 150
    }
    ```
  - Response: `{ betId, status, wager, potentialWinning, timestamp, confirmation }`
  - Purpose: Place a new bet

### 5.2 Get Active Bets
- **GET** `/api/bets/active`
  - Response: Array of user's active/pending bets
  - Purpose: Get all bets still in-play

### 5.3 Get Bet Details
- **GET** `/api/bets/{betId}`
  - Response:
    ```json
    {
      "betId": "bet-123",
      "userId": "user-123",
      "status": "pending", // pending, won, lost, void
      "betType": "parlay",
      "wager": 100,
      "potentialWinning": 450,
      "selections": [...],
      "timestamp": "2026-01-13T15:30:00Z"
    }
    ```
  - Purpose: Get detailed information about a specific bet

### 5.4 Cancel Bet
- **POST** `/api/bets/{betId}/cancel`
  - Response: `{ success: boolean, refundAmount, reason }`
  - Purpose: Cancel an active bet (if allowed)

### 5.5 Settle Bet
- **POST** `/api/bets/{betId}/settle` (Admin/System)
  - Request: `{ betId, result, winnings }`
  - Response: `{ success: boolean, settled: true }`
  - Purpose: Settle completed bets based on match results

---

## 6. CASINO APIs
### 6.1 Get Casino Games
- **GET** `/api/casino/games?category={category}&search={query}`
  - Categories: `lobby, table-games, slots, video-poker, specialty-games`
  - Response:
    ```json
    {
      "games": [
        {
          "id": "blackjack-1",
          "title": "Blackjack",
          "category": "table-games",
          "minBet": 1,
          "maxBet": 100,
          "thumbnail": "url",
          "provider": "provider-name"
        }
      ]
    }
    ```
  - Purpose: Get available casino games

### 6.2 Get Game Details
- **GET** `/api/casino/games/{gameId}`
  - Response: Detailed game info including rules, RTP, volatility
  - Purpose: Get full game information

### 6.3 Start Casino Session
- **POST** `/api/casino/session/start`
  - Request: `{ userId, gameId }`
  - Response: `{ sessionId, gameUrl, balance }`
  - Purpose: Initiate a casino game session

### 6.4 End Casino Session
- **POST** `/api/casino/session/{sessionId}/end`
  - Response: `{ finalBalance, winnings, losses }`
  - Purpose: Close game session and return final balance

---

## 7. LIVE CASINO APIs
### 7.1 Get Live Games
- **GET** `/api/live-casino/games`
  - Response: Array of available live dealer games
  - Purpose: Get live casino options

### 7.2 Join Live Game
- **POST** `/api/live-casino/join`
  - Request: `{ userId, gameId }`
  - Response: `{ sessionId, streamUrl, tableInfo }`
  - Purpose: Join a live casino table

### 7.3 Place Live Bet
- **POST** `/api/live-casino/bet`
  - Request: `{ sessionId, amount, selection }`
  - Response: `{ betId, status }`
  - Purpose: Place bet in live casino game

---

## 8. BONUSES & PROMOTIONS APIs
### 8.1 Get Available Bonuses
- **GET** `/api/bonuses`
  - Response:
    ```json
    {
      "bonuses": [
        {
          "id": "bonus-1",
          "title": "Welcome Bonus",
          "type": "deposit-match", // deposit-match, free-play, free-spins
          "amount": 500,
          "minDeposit": 50,
          "wagering": "20x",
          "expiresAt": "2026-02-13"
        }
      ]
    }
    ```
  - Purpose: Get active promotional bonuses

### 8.2 Claim Bonus
- **POST** `/api/bonuses/{bonusId}/claim`
  - Response: `{ success: boolean, bonusAmount, wagering }`
  - Purpose: Claim a bonus

### 8.3 Get Loyalty Program
- **GET** `/api/loyalty/status`
  - Response: `{ tier, points, nextTier, rewards }`
  - Purpose: Get user's loyalty/VIP status

### 8.4 Redeem Loyalty Points
- **POST** `/api/loyalty/redeem`
  - Request: `{ points, rewardId }`
  - Response: `{ success: boolean, reward }`
  - Purpose: Redeem loyalty points for rewards

---

## 9. SUPPORT & FEEDBACK APIs
### 9.1 Submit Feedback
- **POST** `/api/feedback/submit`
  - Request:
    ```json
    {
      "userId": "user-123",
      "category": "ui-ux", // ui-ux, markets, performance, bugs, other
      "rating": 4,
      "comment": "Great interface!",
      "timestamp": "2026-01-13T15:30:00Z"
    }
    ```
  - Response: `{ feedbackId, success: boolean }`
  - Purpose: Submit user feedback

### 9.2 Get FAQ/Tutorials
- **GET** `/api/support/faqs?category={category}`
  - Response: Array of FAQ items
  - Purpose: Get help documentation

### 9.3 Submit Support Ticket
- **POST** `/api/support/tickets`
  - Request: `{ userId, subject, message, category }`
  - Response: `{ ticketId, status: "open" }`
  - Purpose: Create support ticket

### 9.4 Get Support Tickets
- **GET** `/api/support/tickets`
  - Response: Array of user's support tickets
  - Purpose: Get user's support history

---

## 10. NOTIFICATIONS & MESSAGING APIs
### 10.1 Get Chat Messages
- **GET** `/api/chat/messages?limit=50`
  - Response: Array of chat messages with agent
  - Purpose: Retrieve chat history with support

### 10.2 Send Chat Message
- **POST** `/api/chat/messages`
  - Request: `{ message, userId }`
  - Response: `{ messageId, timestamp }`
  - Purpose: Send message to support chat

### 10.3 Get Notifications
- **GET** `/api/notifications?limit=20`
  - Response: Array of user notifications
  - Purpose: Get user notifications (bets settled, balance updates, etc.)

### 10.4 Mark Notification as Read
- **POST** `/api/notifications/{notificationId}/read`
  - Response: `{ success: boolean }`
  - Purpose: Mark notification as read

---

## 11. SETTINGS & PREFERENCES APIs
### 11.1 Get User Settings
- **GET** `/api/settings`
  - Response:
    ```json
    {
      "language": "en",
      "currency": "USD",
      "notifications": { "email": true, "push": false, "sms": false },
      "gambling": {
        "depositLimit": 5000,
        "dailyLimit": 1000,
        "sessionLimit": 500,
        "selfExclude": false
      }
    }
    ```
  - Purpose: Get user preferences

### 11.2 Update Settings
- **PUT** `/api/settings`
  - Request: Updated settings object
  - Response: `{ success: boolean }`
  - Purpose: Update user preferences

### 11.3 Set Responsible Gaming Limits
- **POST** `/api/settings/responsible-gaming`
  - Request:
    ```json
    {
      "depositLimit": 5000,
      "lossLimit": 1000,
      "sessionTime": 120,
      "selfExclude": false
    }
    ```
  - Response: `{ success: boolean }`
  - Purpose: Set gambling limits for responsible gaming

---

## 12. SEARCH & FILTERING APIs
### 12.1 Search Matches
- **GET** `/api/search/matches?q={query}`
  - Response: Array of matching teams/matches
  - Purpose: Search for specific matches

### 12.2 Search Games
- **GET** `/api/search/games?q={query}`
  - Response: Array of matching casino games
  - Purpose: Search casino games

### 12.3 Get Filters
- **GET** `/api/filters?sport={sport}`
  - Response: Available filter options for sports
  - Purpose: Get filtering options

---

## 13. REAL-TIME DATA APIs
### 13.1 WebSocket: Live Match Updates
- **WS** `/ws/matches/{matchId}`
  - Events: `score-update`, `status-change`, `odds-update`
  - Payload: Updated match/odds data
  - Purpose: Real-time match score and odds updates

### 13.2 WebSocket: Live Casino Stream
- **WS** `/ws/live-casino/{sessionId}`
  - Events: `card-dealt`, `result`, `balance-update`
  - Purpose: Real-time live casino game updates

### 13.3 WebSocket: Account Updates
- **WS** `/ws/account/{userId}`
  - Events: `balance-update`, `bet-settled`, `bonus-added`
  - Purpose: Real-time account information updates

---

## 14. ADMIN/REPORTING APIs (System)
### 14.1 Get System Statistics (Dashboard)
- **GET** `/api/admin/stats`
  - Response: Active users, total bets, revenue, etc.
  - Purpose: Dashboard metrics

### 14.2 Update Match Results
- **POST** `/api/admin/matches/{matchId}/result`
  - Request: `{ homeScore, awayScore, status }`
  - Purpose: Update match results (triggers bet settlement)

### 14.3 Update Odds
- **POST** `/api/admin/odds/{matchId}`
  - Request: `{ spread, moneyline, total }`
  - Purpose: Update odds (broadcasts to WebSocket)

---

## AUTHENTICATION & SECURITY REQUIREMENTS

### Headers Required
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-API-Key: {api_key} // For backend services
```

### Rate Limiting
- Suggest: 100 requests/minute per authenticated user
- 50 requests/minute for unauthenticated endpoints

### CORS
- Allow requests from frontend domain

### Error Response Format
```json
{
  "status": 400,
  "error": "Invalid input",
  "message": "Detailed error description",
  "timestamp": "2026-01-13T15:30:00Z"
}
```

---

## DATA VALIDATION REQUIREMENTS

- Username: 3-20 alphanumeric characters
- Password: Min 8 characters, upper, lower, number, special char
- Amount: Must be numeric, > 0
- Odds: Must be valid American odds format
- Wager: Min $1, Max user balance

---

## SUMMARY TABLE

| Category | # of Endpoints | Key Operations |
|----------|-----------------|-----------------|
| Authentication | 6 | Register, Login, Profile |
| Account Management | 5 | Balance, Deposits, Withdrawals |
| Sports Betting | 7 | Matches, Odds, Props |
| Betting | 5 | Place, View, Cancel Bets |
| Casino | 4 | Games, Sessions |
| Live Casino | 3 | Join, Bet, Stream |
| Bonuses | 4 | Claim, Loyalty, Redeem |
| Support | 4 | Chat, Tickets, FAQs |
| Settings | 3 | Preferences, Limits |
| Search | 3 | Search, Filter |
| Real-time (WS) | 3 | Live Updates |
| Admin | 3 | Stats, Results, Odds |
| **TOTAL** | **52+ Endpoints** | **Complete Sports Betting Platform** |

---

## RECOMMENDED TECH STACK FOR BACKEND

- **Framework**: Node.js (Express/Nest.js) or Python (Django/FastAPI)
- **Database**: PostgreSQL (transactions, accounts)
- **Cache**: Redis (real-time odds, balance)
- **Message Queue**: RabbitMQ/Kafka (async tasks, bet settlement)
- **WebSocket**: Socket.io or native WebSocket
- **Auth**: JWT + Refresh tokens
- **Payment Gateway**: Stripe, PayPal, Crypto API
