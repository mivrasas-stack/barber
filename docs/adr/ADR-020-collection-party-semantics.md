# ADR-020: Collector Party Semantics & Payable/Receivable Direction

## Status
Approved

## Context
When an appointment is completed in a barbershop with affiliated independent professionals, money may be collected either at the shop's reception desk or directly by the barber (cash or barber's personal terminal). The direction of legal obligations (who owes whom) reverses depending on who received the cash.

## Decision
We define clear domain semantics based on `collectorParty`:
1. `COLLECTED_BY_HOST`:
   - Customer pays front desk. Host receives gross cash + tip.
   - Host records: DEBIT Cash (`gross + tip`), CREDIT Commission Revenue (`hostCommission`), CREDIT Professional Commission Payable (`proShare`), CREDIT Tips Payable (`tip`).
   - Professional records: DEBIT Host Receivable (`proShare + tip`), DEBIT Commission Expense (`hostCommission`), CREDIT Service Revenue (`gross`), CREDIT Tip Revenue (`tip`).
   - Outcome: Host owes money to Carlos.
2. `COLLECTED_BY_PROFESSIONAL`:
   - Customer pays Carlos directly. Carlos receives gross cash + tip.
   - Professional records: DEBIT Cash (`gross + tip`), CREDIT Service Revenue (`gross`), CREDIT Tip Revenue (`tip`), DEBIT Commission Expense (`hostCommission`), CREDIT Host Commission Payable (`hostCommission`).
   - Host records: DEBIT Host Commission Receivable (`hostCommission`), CREDIT Commission Revenue (`hostCommission`).
   - Outcome: Carlos owes money to Host.

## Consequences
- Accurate reflection of financial reality.
- Seamless dual-entry bookkeeping matching physical cash movements.
