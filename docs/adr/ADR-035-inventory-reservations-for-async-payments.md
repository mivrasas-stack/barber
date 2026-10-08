# ADR-035: Inventory Reservations for Asynchronous Payment Lifecycles

## Status
Approved

## Context
When a customer begins an online checkout involving physical retail products, payment authorization can take several minutes (or hours in cash vouchers/bank transfers).
- If stock is deducted immediately, abandoned checkouts permanently leak physical inventory.
- If stock is not deducted, multiple customers could simultaneously buy the last physical unit, resulting in overselling upon payment confirmation.

## Decision
1. **Three-State Inventory Model**:
   - `on_hand`: Physical units currently located in custody.
   - `reserved`: Units allocated to active, non-expired checkout sessions.
   - `available = on_hand - reserved`: Stock available for new orders.
2. **Explicit Reservation Entities**:
   - During `CreatePaymentIntent`, `inventory_reservations` records are created with a time-to-live (`expires_at`, default 15 minutes).
   - `inventory_positions.reserved` is atomically incremented under row locks.
   - If `available < requested`, the intent creation fails with `INSUFFICIENT_STOCK`.
3. **Reservation Lifecycle Transitions**:
   - **On Payment Success (`SUCCEEDED`)**:
     - Reservation status changes to `COMMITTED`.
     - `reserved` is decremented; `on_hand` is decremented.
     - An immutable `SALE` stock movement is posted.
   - **On Payment Decline / Intent Cancellation (`FAILED`, `CANCELLED`)**:
     - Reservation status changes to `RELEASED`.
     - `reserved` is decremented; `available` restores immediately.
   - **On Expiration**:
     - An automated background use case (`ExpireReservationsUseCase`) finds reservations where `status = 'ACTIVE'` and `expires_at < NOW()`, marking them `EXPIRED` and releasing reserved stock.

## Consequences
- Zero overselling under concurrent checkouts.
- Zero inventory leakage from abandoned carts or declined cards.
- Complete audit trail of temporary stock allocations.
