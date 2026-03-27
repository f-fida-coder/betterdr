# Project Rules

## Stack
- Frontend: React + Vite
- Backend: PHP
- Database: MySQL
- Deployment target: production-ready hosting environment
- Do not introduce Node.js backend patterns into the PHP backend

## Hard rules
1. Do not replace PHP backend patterns with Express, Node, or Firebase logic.
2. Do not introduce MongoDB assumptions. This project uses MySQL.
3. Do not change architecture casually.
4. Do not create fake placeholder logic for betting, balance, settlement, or admin reports.
5. Do not mark a feature complete until related balance/history/admin effects are checked.
6. Do not change unrelated files just because they look messy.
7. Keep mobile and admin responsiveness in mind for UI changes.
8. For money logic, correctness is more important than visual polish.
9. Never trust frontend-only game results for casino settlement.
10. When unsure, inspect code first and state assumptions clearly.

## UI expectations
- professional sportsbook and casino feel
- no broken alignment
- no random spacing inconsistencies
- admin pages should be usable on smaller screens
- dropdowns, filters, cards, tables, and summaries must feel consistent

## DB and security expectations
- use prepared statements
- validate all input
- protect money-changing actions with proper server-side checks
- keep logging and error handling intact
- do not expose secrets or unsafe debug output