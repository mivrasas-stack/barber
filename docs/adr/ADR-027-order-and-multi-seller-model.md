# ADR-027: Order Entity, Context Tenant & Multi-Seller Basket Architecture

## Status
Approved

## Context
In a modern shared salon or barbershop, a client may receive services from an affiliated independent professional and purchase retail products owned by the host shop, the professional, or both in a single visit. 
Forcing the client to swipe a credit card twice or creating separate physical receipts creates commercial friction.

## Decision
1. **Context Tenant vs. Line-Item Seller**:
   - The `orders` header specifies `tenant_id`, which represents the **Operational Context Tenant** (the host barber shop or independent studio where the checkout terminal resides).
   - Each `order_items` record explicitly identifies `seller_tenant_id`, which represents the **Economic Beneficiary** of that specific line item.
2. **Order Lifecycle**:
   - Orders begin in `DRAFT` status and can accept line items and discounts.
   - At checkout, tenders are validated ($\sum \text{tenders} \ge \text{total}$), inventory is atomically locked and decremented, appointments (if linked) are completed, and financial journal entries are posted within a single PostgreSQL ACID transaction.
   - The order status atomically transitions to `COMPLETED`.
3. **Multi-Seller Settlement Tracking**:
   - If an order contains items where $\text{seller\_tenant\_id} \ne \text{order.tenant\_id}$, the checkout automatically records an inter-tenant payable/receivable entry reflecting the host's collection of third-party funds.

## Consequences
- Unified customer checkout experience without commercial friction.
- Total transparency regarding which entity sold each product or service.
- Strict auditing prevents inter-tenant revenue misappropriation.
