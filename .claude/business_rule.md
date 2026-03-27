# Business Rules

## Core principle
For all sportsbook and casino work, wallet balance, transaction history, user-visible result, and admin-visible result must stay consistent.

## Sportsbook rules
- A placed bet must have a reliable record.
- Pending, won, lost, cancelled, or deleted states must be represented consistently.
- A user should not see one result while admin sees another.
- Bet slips must respect the user's actual selected stake and option.
- Do not hardcode a default stake in a way that overrides user selection.
- A game/event that should no longer be bettable must not keep accepting wagers.

## Casino rules
- A casino wager must not be treated as complete unless balance and history are both handled correctly.
- Loss should reduce balance correctly.
- Win should increase balance correctly.
- Result records should be visible where the product expects them.
- Do not trust client-side result generation alone for real-money behavior.

## Transaction rules
- Transactions must be understandable and auditable.
- Money-in, money-out, wager, payout, refund, adjustment, and transfer types should not be mixed carelessly.
- If balance changes, there should usually be a traceable reason in history or logs.

## Admin rules
- Admin panels should reflect real system state, not partial UI assumptions.
- Reporting logic must follow actual business definitions, not guessed formulas.
- Weekly figures, summaries, and commission-related displays must use verified rules.
- Search, filters, totals, and counts must remain aligned.

## Agent / hierarchy rules
- Agent and master-agent relationships should not be simplified casually.
- Commission-related logic should be verified against real hierarchy behavior before edits.
- Do not assume one-level referral logic if the code supports more layered relationships.

## Quality rule
If a task touches balance, bets, payouts, or reporting, treat it as high risk and validate the full chain, not just the screen that was edited.