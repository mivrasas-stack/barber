# ADR-044: Platform SaaS Revenue Ledger Isolation

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
Barber Paradise includes a certified double-entry financial core (`Stage 3A` / `Stage 3A.1`) designed for tenant shop accounting (service revenues, tips, barber commissions, chair rent, settlements). SaaS software subscription revenue collected by the platform must be posted to the double-entry ledger without contaminating tenant commercial accounts or mixing marketplace sales with software revenue.

## Decision
1. **Dedicated SaaS Financial Accounts**:
   - `1070_PLATFORM_SUBSCRIPTION_RECEIVABLE`: Current Asset - Invoiced but uncollected SaaS subscription receivables.
   - `4060_SAAS_SUBSCRIPTION_REVENUE`: Revenue - Earned platform software licensing fees.
   - `5060_SOFTWARE_SUBSCRIPTION_EXPENSE`: Expense - Software licensing cost from tenant perspective.
2. **Double-Entry Booking Pattern for Subscription Payments**:
   - When a SaaS invoice is settled via a payment gateway:
     ```text
     DEBIT   1060_PAYMENT_PROVIDER_CLEARING    [Invoice Total]
     CREDIT  4060_SAAS_SUBSCRIPTION_REVENUE    [Invoice Total]
     ```
   - Status: `POSTED`.
   - `entry_type`: `SUBSCRIPTION_BILLING`.
   - `source_type`: `SUBSCRIPTION_INVOICE`.
   - `source_id`: `subscription_invoices.id`.
3. **Ledger Boundary & Contamination Guard**:
   - SaaS subscription journal entries are posted with `tenant_id = platformTenantId` (or collector tenant).
   - Under no circumstances does a SaaS subscription payment credit `4010_SERVICE_REVENUE` or `4020_PRODUCT_SALES_REVENUE`.
   - The mathematical invariant `SUM(DEBIT) === SUM(CREDIT)` holds strictly across all subscription entries.

## Consequences
- **Positive**: Strict financial compliance and auditability.
- **Positive**: Zero financial leakage between marketplace transactions and SaaS licensing revenue.
