# ADR-014: Separación entre Module Entitlements y RBAC Permissions

## Context
En plataformas SaaS, se suele confundir el control de acceso basado en roles (RBAC) con la habilitación de módulos comerciales (Feature Flags / Entitlements). Un usuario puede tener el rol de `OWNER` con permiso de ver reportes analíticos (`finance.read`), pero si el plan contratado por su organización no incluye el módulo de analítica o facturación, la funcionalidad debe permanecer deshabilitada comercialmente.

Asimismo, los administradores de la plataforma necesitan poder forzar la activación o desactivación de módulos específicos para resolver soporte técnico, habilitar betas o aplicar suspensiones parciales.

## Decision
Desacoplar de forma estricta los dos conceptos:
1. **Module Entitlements (¿Tiene la organización derecho a usar esta funcionalidad?):**
   - Resuelto a nivel de Tenant mediante el `ModuleEntitlementResolver`.
   - Se compone de:
     - Estado del módulo en el catálogo (`modules.status`: `AVAILABLE`, `COMING_SOON`, etc.).
     - Módulos incluidos en el plan contratado (`plan_modules`).
     - Vigencia de la suscripción (`tenant_subscriptions.status`: `ACTIVE` o `TRIALING`).
     - Overrides administrativos por Platform Admin (`tenant_module_overrides`: `FORCE_ENABLED`, `FORCE_DISABLED` con motivo de auditoría).
     - Validación del árbol de dependencias (`module_dependencies`): si un módulo padre está deshabilitado, el dependiente se marca como `DEPENDENCY_MISSING`.
     - Módulos de núcleo obligatorios (`MANDATORY_CORE_MODULES`) que jamás pueden ser desactivados.
2. **RBAC Permissions (¿Tiene el usuario individual permiso para ejecutar esta acción?):**
   - Resuelto a nivel de Usuario y Membresía mediante `roles` y `permissions`.

## Alternatives
- **Integrar módulos como permisos RBAC adicionales:** Rechazado. Provoca explosión combinatoria de roles y requiere mutar los roles de todos los usuarios de un tenant al cambiar de plan comercial.
- **Feature Flags estáticos en código o variables de entorno:** Rechazado. No permite personalización por tenant ni cambios dinámicos desde el panel administrativo.

## Consequences
- **Positivas:** Clara separación de responsabilidades. La UI puede ocultar o deshabilitar pestañas y rutas del sidebar dinámicamente según el plan, mientras que la API protege los endpoints contra ejecuciones no autorizadas.
- **Negativas:** La resolución efectiva de módulos requiere una consulta agregada con caché o resolución eficiente por tenant.
