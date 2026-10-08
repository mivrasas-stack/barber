# Commerce — Physical Inventory & Kardex Ledger

## Overview
The Inventory module provides physical stock tracking across locations and owners. It ensures mathematical auditability via an immutable movement kardex and enforces negative-stock prohibition under high concurrency.

## Core Concepts
- **`inventory_positions`**: Current operational availability indexed by `(owner_tenant_id, location_id, product_variant_id)`.
  - `on_hand`: Physical count on premises. Enforced by DB constraint `CHECK (on_hand >= 0)`.
  - `reserved`: Units allocated to active carts or pending checkouts.
- **`stock_movements`**: Immutable kardex event ledger. Every stock alteration records:
  - `movement_type`: `PURCHASE_RECEIPT`, `SALE_DEDUCTION`, `SALE_RETURN`, `ADJUSTMENT_INCREASE`, `ADJUSTMENT_DECREASE`, `INTERNAL_TRANSFER_IN`, `INTERNAL_TRANSFER_OUT`.
  - `quantity_delta`: Signed integer representing the stock change.
  - `unit_cost_minor`: Cost snapshot at time of movement.
  - `actor_user_id`: Audit trail of the user who performed the change.

## Cross-Tenant Custody
An independent professional can store stock at a host salon location provided:
1. An active affiliation exists between the solo workspace and the host tenant.
2. The specific location is active in `professional_affiliation_locations`.

Host staff can view physical stock counts for inventory audits, but cannot modify professional stock or inspect wholesale supplier costs.

## APIs
- `GET /api/v1/inventory`: Lists physical stock positions with available counts.
- `GET /api/v1/inventory/movements`: Immutable kardex movement log.
- `POST /api/v1/inventory/receive`: Receives purchase orders and increments physical stock.
- `POST /api/v1/inventory/adjust`: Manual adjustments with mandatory audit reason.
