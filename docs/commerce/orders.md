# Commerce — Orders & Commercial Transactions

## Overview
The Orders module manages commercial sale tickets, carts, line items, tenders, and lifecycle transitions.

## Order Lifecycle
```text
[ DRAFT ]
   │
   ├── (Checkout) ──> [ COMPLETED ] ──> (Refund) ──> [ REFUNDED ]
   │
   └── (Void) ───────> [ CANCELLED ]
```

## Order Structure
- **`orders`**: Header containing `order_number`, operational context `tenant_id`, `location_id`, `customer_user_id`, linked `appointment_id`, and financial totals (`subtotal_minor`, `discount_minor`, `total_minor`).
- **`order_items`**: Line items supporting both services and physical retail products:
  - `item_type`: `SERVICE` or `PRODUCT`.
  - `seller_tenant_id`: Economic owner of this line item.
  - `unit_price_minor` & `unit_cost_snapshot_minor`: Immutable pricing snapshots.
- **`order_tenders`**: Payment methods used (`CASH`, `CARD`, `TRANSFER`, etc.) and amount tendered.

## APIs
- `GET /api/v1/orders`: List orders with multi-tenant filtering.
- `GET /api/v1/orders/[id]`: Full order details including lines and tenders.
- `POST /api/v1/orders`: Create a new draft order.
- `POST /api/v1/orders/[id]/items`: Append service or product line item.
- `POST /api/v1/orders/[id]/cancel`: Cancel a draft order.
- `POST /api/v1/orders/[id]/return`: Symmetrically refund a completed order and restore inventory.
