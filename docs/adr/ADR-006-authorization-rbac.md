# ADR-006: Modelo de Autorización RBAC Granular Desacoplado de Identidad

## Context
En aplicaciones ingenuas se suele guardar una columna simple `users.role = "OWNER"`. Esto impide que un mismo usuario humano sea dueño de una barbería A, empleado en una barbería B y cliente en una barbería C sin tener que crear múltiples cuentas de usuario con correos distintos. Además, las comprobaciones de tipo `role === "OWNER"` son rígidas y no permiten delegación granular de permisos.

## Decision
Desacoplar la identidad de la autorización mediante un modelo de 4 niveles:
1. `User` (Identidad global única).
2. `Membership` (Relación M:N entre `User` y `Tenant`).
3. `Role` (Roles asignables dentro del tenant o plantillas globales: `OWNER`, `MANAGER`, `EMPLOYEE`).
4. `Permission` (Permisos granulares en formato `dominio.accion`, ej. `appointments.read`, `tenant.manage`, `inventory.manage`).
5. La autorización en aplicación se evalúa mediante `AuthorizationContext.hasPermission(code)`.

## Alternatives
- **Rol único en tabla Users:** Rechazado. Incompatible con escenarios multi-negocio del mundo real.
- **ABAC puro (Attribute-Based Access Control):** Rechazado por complejidad innecesaria en esta etapa; RBAC con permisos granulares cubre el 100% de los requisitos actuales.

## Consequences
- **Positivas:** Flexibilidad total para que cualquier usuario cambie de contexto entre negocios, extensibilidad de permisos sin alterar el esquema de base de datos, aislamiento estricto de accesos.
- **Negativas:** Consultas con joins adicionales para resolver el contexto de autorización completo (resuelto mediante consultas optimizadas e indexación en `membership_roles` y `role_permissions`).

## Migration
Se implementaron las tablas `roles`, `permissions`, `membership_roles`, `role_permissions`, el repositorio `DrizzleAuthorizationRepository`, y la suite de pruebas unitarias que verifica la resolución de permisos y el aislamiento de tenants.
