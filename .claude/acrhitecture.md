# Architecture

## High-level modules
This project has four major domains:
1. sportsbook
2. casino
3. admin/agent operations
4. wallet / transactions / reporting

## Frontend direction
The frontend is a React application with Vite and multiple major UI areas:
- public landing / dashboard
- sportsbook views
- casino views
- mobile views
- admin and agent views

## Important frontend mindset
When editing frontend:
- identify the exact view component first
- trace where data comes from
- check whether there is shared utility or context already used
- avoid duplicating logic in multiple screens
- preserve existing naming and patterns where possible

## Backend direction
The backend is PHP-based.
Any new API work should follow existing routing, controller, validation, and DB access patterns already present in the project.
Do not invent a new backend style unless the current code clearly requires a small isolated helper.

## Database direction
The database is MySQL only.
Always verify table names, columns, joins, and aggregation logic from the actual codebase or schema before editing queries.

## Admin direction
Admin is not a side feature.
Any change affecting bets, users, agents, transactions, games, or settlement may also affect:
- admin tables
- reports
- summaries
- logs
- filters
- weekly figures
- ticket writer / customer detail pages

## Casino direction
Casino integrations must be treated as server-authoritative wherever money is involved.
Do not rely on client-only win/loss decisions for real balance changes.

## Sportsbook direction
Sportsbook flows may involve:
- event listing
- odds display
- bet slip selection
- bet confirmation
- active bets
- settled bets
- admin visibility
Any edit must preserve these end-to-end relationships.