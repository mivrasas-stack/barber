# ADR-026: Cross-Tenant Stock Custody, Affiliations & Physical Storage Scoping

## Status
Approved

## Context
In chair-rental and hybrid affiliation models, an independent professional brings physical retail stock to display and sell at the host barber shop's workstation. 
The host barber shop provides physical custody and shelf space, while the solo professional retains 100% economic ownership of the inventory asset.

## Decision
1. **Ownership vs. Physical Custody Separation**:
   - Every inventory position and kardex movement explicitly separates economic ownership (`owner_tenant_id`) from physical custody location (`location_id`).
   - Professional-owned items placed inside a host location retain the solo workspace's tenant ID as `owner_tenant_id`.
2. **Active Affiliation Precondition**:
   - Stock cannot be received, transferred, or sold at a host location unless an `ACTIVE` affiliation exists in `professional_affiliations` linking the solo professional's workspace to the host tenant.
   - The specific host location must also be authorized in `professional_affiliation_locations` with `status = 'ACTIVE'`.
3. **Suspension & Severance Enforcement**:
   - If an affiliation is `SUSPENDED` or `TERMINATED`, POS checkout of the professional's stock at that location is immediately rejected (`AFFILIATION_REQUIRED`).
4. **Custodial Privacy**:
   - The host barber shop cannot alter the wholesale cost of professional stock or inspect the professional's supplier cost basis.
   - Professional stock cannot be liquidated or seized by host staff via standard POS operations.

## Consequences
- Clean legal and operational separation between physical custody and financial asset ownership.
- Multi-location professionals can safely maintain independent stock balances across different host salons simultaneously.
