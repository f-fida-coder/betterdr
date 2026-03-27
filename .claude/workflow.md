# Working Workflow

## For every new task
1. Restate the exact requested outcome in one or two lines.
2. Identify the minimum relevant files.
3. Read those files first.
4. Explain current behavior before changing it.
5. Make the smallest safe change that solves the real issue.
6. List side effects and impacted flows.
7. Give manual test steps.

## Required behavior for Claude Code
- do not jump straight into coding
- inspect existing implementation first
- prefer editing existing files over creating new abstractions
- preserve established patterns unless they are clearly broken
- avoid speculative refactors

## When fixing bugs
- first identify where the bug originates
- distinguish UI-only bug vs backend/state bug vs database/reporting bug
- do not patch symptoms only if root cause is visible

## When building new features
- trace related frontend view
- trace backend endpoint
- trace database impact
- trace admin/reporting impact
- trace transaction/balance impact if money is involved

## Before finishing
Always provide:
- what changed
- which files changed
- why this approach was chosen
- what still needs verification
- exact manual test checklist

## Red flags
Pause and verify more carefully if the task touches:
- bet settlement
- balance updates
- casino game outcomes
- transaction history
- admin summaries
- weekly figures
- agent commission
- deleted or cancelled wagers