# BettorPlays247 Claude Code Context Index

Read this file first at the start of every new session.

## Required reading order
1. Read `PROJECT_RULES.md`
2. Read `CURRENT_STATE.md`
3. Read only the task-relevant file(s):
   - `ARCHITECTURE.md` for codebase structure
   - `BUSINESS_RULES.md` for betting, balance, admin, and reporting logic
   - `WORKFLOW.md` for how to analyze, edit, and validate changes
   - `PROMPT_STARTERS.md` for session prompt patterns

## Purpose
This folder gives project memory and operating rules for Claude Code.
It is not a substitute for reading the actual code.
Before changing any feature, inspect the real files involved.

## Non-negotiable rule
Never assume a file, endpoint, table, or flow exists just because it existed in a past session.
Always verify in the current workspace before editing.

## Success criteria for every task
- preserve existing working flows
- avoid unrelated refactors
- keep sportsbook, casino, admin, and wallet logic consistent
- maintain production-ready UX
- explain impacted files and test steps after changes