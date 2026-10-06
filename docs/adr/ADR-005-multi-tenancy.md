# ADR-005: Modelo Multi-Tenancy Shared Database / Shared Schema

## Context
Barber Paradise está diseñado para alojar potencialmente decenas de miles de barberías y negocios de servicios. Se evaluó la estrategia de particionamiento multi-tenant: Database per Tenant, Schema per Tenant, o Shared Database + Shared Schema.

## Decision
Adoptar **Shared Database + Shared Schema** en PostgreSQL. Cada entidad vinculada a un negocio posee una columna `tenant_id: uuid`. La autorización de la aplicación verifica rigurosamente el contexto de pertenencia (memberships) en cada solicitud y nunca confía en parámetros provistos libremente por el frontend (ej. `?tenantId=...`).

## Alternatives
- **Database per Tenant:** Rechazado para esta etapa. El costo de infraestructura de mantener miles de bases de datos PostgreSQL independientes, sumado a la complejidad de migraciones simultáneas, es inviable económica y operativamente.
- **Schema per Tenant:** Rechazado. Provoca problemas de escalabilidad con el número de tablas en el catálogo de PostgreSQL y dificulta la agregación global de analíticas para Platform Admins.

## Consequences
- **Positivas:** Máxima eficiencia de costos y recursos de conexión, facilidad extrema para ejecutar migraciones uniformes, soporte nativo para reportes consolidados y consultas cruzadas autorizadas.
- **Negativas:** Exige disciplina implacable en los repositorios para incluir siempre el filtro `WHERE tenant_id = ...` y evitar fugas cross-tenant (cubierto por tests automáticos en `tests/foundation.test.ts`).

## Migration
Se definieron las tablas `tenants`, `locations`, y `memberships` con claves foráneas e índices únicos compuestos `(tenant_id, user_id)` y `(tenant_id, slug)`.
