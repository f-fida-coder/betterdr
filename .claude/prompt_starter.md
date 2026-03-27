# Prompt Starters

Use prompts like these in Claude Code.

## New session starter
Read `.claude/INDEX.md` first, then `.claude/PROJECT_RULES.md` and `.claude/CURRENT_STATE.md`.
After that, inspect only the files relevant to this task before making changes.

## Frontend bug
Read `.claude/INDEX.md` and `.claude/ARCHITECTURE.md`.
Then inspect the exact React files involved in this UI bug.
Explain the root cause first, then make the smallest safe fix.
Do not change unrelated styling or logic.

## Backend/API task
Read `.claude/INDEX.md`, `.claude/ARCHITECTURE.md`, and `.claude/WORKFLOW.md`.
Then inspect the existing PHP routes/controllers/models involved.
Follow current backend patterns and do not invent a new backend structure.

## MySQL/reporting task
Read `.claude/INDEX.md`, `.claude/BUSINESS_RULES.md`, and `.claude/WORKFLOW.md`.
Verify actual schema/query usage before editing.
Do not assume table or column names.
Protect correctness over speed.

## Casino integration task
Read `.claude/INDEX.md`, `.claude/BUSINESS_RULES.md`, and `.claude/WORKFLOW.md`.
Inspect how balance, history, and result handling currently work.
Do not trust client-only game outcomes for settlement.

## Sportsbook task
Read `.claude/INDEX.md`, `.claude/BUSINESS_RULES.md`, and `.claude/WORKFLOW.md`.
Trace event listing, odds display, bet placement, settlement state, and admin visibility before editing.

## Admin panel task
Read `.claude/INDEX.md`, `.claude/ARCHITECTURE.md`, and `.claude/BUSINESS_RULES.md`.
Keep the UI professional and responsive.
Do not break filters, summaries, counts, or linked workflows.