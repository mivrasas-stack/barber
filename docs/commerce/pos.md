# Commerce — Transactional POS & Checkout

## Overview
The Point of Sale (POS) is the execution engine that coordinates order completion, tender verification, physical stock deduction, double-entry financial posting, appointment completion, and audit event emission within a single ACID transaction.

## Checkout Sequence
```text
1. Lock Order (SELECT ... FOR UPDATE)
2. Verify Idempotency-Key Fingerprint (SHA-256)
3. Validate Tenders >= Order Total
4. Lock & Deduct Physical Inventory (SELECT ... FOR UPDATE on inventory_positions)
5. Record stock_movements (type: SALE_DEDUCTION)
6. If linked to Appointment:
   - Check no prior APPOINTMENT journal exists
   - Update appointment.status = 'COMPLETED'
   - Append appointment_status_history
7. Post Double-Entry Journal Entry:
   - sourceType: 'ORDER'
   - Revenue recognition (Sale Price)
   - COGS recognition (Historical Cost)
   - Symmetrical debit/credit verification
8. Update order.status = 'COMPLETED'
9. Record Audit Log & Outbox Event ('order.completed')
```

## Idempotency Protocol
- All checkout calls require `Idempotency-Key` header.
- Repeated identical requests replay the completed order payload without duplicate stock deductions or journal postings.
- Reusing an existing key with different parameters returns HTTP 409 (`ConflictError`).

## APIs
- `POST /api/v1/pos/checkout`: Complete order and post financial entries atomically.
