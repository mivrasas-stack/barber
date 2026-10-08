# ADR-024: Product Ownership, Seller Entity & Catalog Isolation

## Status
Approved

## Context
Barber Paradise v2 supports two distinct workspace archetypes under a single operational roof:
1. Host Barber Shops (`BUSINESS` tenants) operating physical branches and shared chairs.
2. Solo Independent Professionals (`SOLO_PROFESSIONAL` tenants) operating their own economic book, pricing, and retail inventory.

When retail products are sold within a host facility, products may belong economically either to the host barber shop (e.g., house pomades, general grooming supplies) or directly to the independent professional (e.g., signature styling products, personal waxes).

## Decision
1. **Catalog Ownership Scoping**:
   - Every product record in `products` and variant record in `product_variants` belongs strictly to an `owner_tenant_id`.
   - The product owner is the sovereign seller of that item.
2. **Catalog Mutation Boundaries**:
   - A tenant (or user acting in tenant context) can only create, update, or archive products where `owner_tenant_id = current_tenant_id`.
   - Affiliated professionals operating within a host location can never mutate, deactivate, or delete host catalog products.
3. **Cross-Tenant Catalog Visibility & Cost Privacy**:
   - Host catalog products are visible for read/lookup to staff and affiliated professionals at that host location for POS selection.
   - However, unit cost basis (`cost_minor`) is classified as sensitive financial data. It is redacted for any actor without explicit `inventory.cost.read` or `finance.read` permissions. Affiliated professionals never receive host cost basis.

## Consequences
- Guaranteed separation of commercial catalogs.
- Zero risk of cross-tenant catalog contamination or unauthorized price alterations.
- Preserves commercial privacy while allowing friction-free POS lookups.
