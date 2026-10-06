# ADR-017: Resolución de Espacios de Trabajo y Cambio Seguro de Contexto

## Context
Un único usuario en Barber Paradise puede poseer o participar en múltiples espacios de trabajo:
- Puede ser `OWNER` de su propio Solo Workspace (`Carlos Barber Studio`).
- Puede ser `AFFILIATED_PROFESSIONAL` en una o varias barberías anfitrionas (`The Royal Barber Shop`, `Gentleman Club`).
- Puede ser `MANAGER` o `EMPLOYEE` en un salón tradicional.

Si la sesión del usuario no maneja explícitamente el tenant activo o permite el cambio de contexto arbitrario sin validación, se vulnera el aislamiento multi-tenant y se expone la plataforma a elevación de privilegios o acceso no autorizado a datos ajenos.

## Decision
Implementar un caso de uso de resolución y validación de contexto de workspace (`ResolveWorkspacesUseCase`):
1. **Resolución de Espacios Autorizados (`GET /api/v1/workspaces`):**
   - Agrega todas las membresías activas del usuario en la tabla `memberships`.
   - Agrega todas las barberías anfitrionas donde el usuario tenga una afiliación activa (`professional_affiliations.status = 'ACTIVE'`).
   - Retorna una lista estructurada con los roles exactos (`OWNER`, `MANAGER`, `EMPLOYEE`, `AFFILIATED_PROFESSIONAL`) y el indicador del workspace actualmente seleccionado.
2. **Validación y Cambio de Contexto (`POST /api/v1/workspaces/switch`):**
   - Antes de alternar el contexto, el caso de uso ejecuta `validateAccess(userId, targetTenantId)`.
   - Si el usuario no pertenece a la organización solicitada ni tiene una afiliación activa con ella, la petición es rechazada de inmediato con un error `403 Forbidden` (`WORKSPACE_ACCESS_DENIED`).
   - Si es válido, se actualiza la cookie de sesión o el estado de sesión activa y la interfaz se recarga hacia la ruta correspondiente (`/professional` para Solo Workspaces, `/barber` para negocios tradicionales).
3. **Componente de UI Reutilizable (`WorkspaceSwitcher`):**
   - Integrado en el navbar superior tanto del portal de barbería como del portal del profesional independiente, mostrando insignias visuales del tipo de tenant (`Solo` vs `Sede`) y el rol asignado.

## Alternatives
- **Permitir cambiar de tenant vía query param en cada endpoint (ej. `?tenantId=...`):** Rechazado. Altamente vulnerable a manipulaciones y errores de omisión.
- **Requiere cerrar e iniciar sesión para cada espacio:** Rechazado. Extremadamente perjudicial para la experiencia de usuario de profesionales con alta movilidad.

## Consequences
- **Positivas:** Seguridad por diseño con validación server-side estricta en cada cambio de contexto. Experiencia fluida para el profesional que atiende en múltiples sedes.
- **Negativas:** La API debe resolver el `tenantId` activo desde la sesión validada en cada petición.
