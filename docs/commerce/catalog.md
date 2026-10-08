# Commerce — Product Catalog & Variants

## Overview
The Product Catalog module manages products, product variants, SKUs, and pricing across multi-tenant workspaces. It supports both host barber shops and independent solo professionals operating within host locations.

## Data Model
- **`product_categories`**: Hierarchical classification scoped by `tenant_id`.
- **`products`**: Base product definitions scoped by `owner_tenant_id`. Contains name, brand, description, and status (`ACTIVE`, `ARCHIVED`).
- **`product_variants`**: Specific purchasable units with unique `sku`, `barcode`, `price_minor`, `cost_minor`, and reorder thresholds.

## Tenancy & Permissions
| Action | Required Permission | Scoping Rule |
| :--- | :--- | :--- |
| View Products | `products.read` | Reads own products + host products if affiliated |
| View Cost Basis | `inventory.cost.read` or `finance.read` | Redacted for affiliates; visible only to authorized host owners/managers |
| Manage Catalog | `products.manage` | Strict write isolation to `owner_tenant_id` |

## APIs
- `GET /api/v1/products`: Lists catalog items with automatic cost redaction for non-privileged callers.
- `POST /api/v1/products`: Creates a new product and initial variants for the caller's tenant.
