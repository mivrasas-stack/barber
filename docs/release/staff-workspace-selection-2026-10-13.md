# Corrección crítica: selección de barbería y creación de barberos
Fecha: 13 de octubre de 2026

## Síntoma

En `/barber/barberos` y `/business/barberos`, el directorio "Mis Barberos" mostraba «Selecciona la barbería activa» aunque el propietario ya había iniciado sesión. La barra de espacios mostraba «Cargando espacio» y el botón «Nuevo barbero» no completaba el registro.

## Causas reales

1. `POST /api/auth/login` devolvía `activeTenantId` en el JSON, pero **no guardaba** `barber_active_workspace` en una cookie.
2. `WorkspaceSwitcher` esperaba una respuesta con campos `tenantId`, `tenantType` e `isCurrent`; `GET /api/v1/workspaces` devuelve `id`, `type` y `activeWorkspaceId`. Por eso el selector no podía identificar el espacio actual.
3. El selector enviaba `targetTenantId`, pero `POST /api/v1/workspaces/switch` requiere `workspaceId`.
4. `requireStaffAdmin` rechazaba incluso una cuenta OWNER de una única barbería si entraba con una sesión antigua sin cookie.
5. La caché compilada de Next en el puerto local `9002` presentaba errores 500 no relacionados con permisos; se preservó antes de regenerar.

## Implementación

- `WorkspaceSwitcher` utiliza ahora el contrato correcto de la API, muestra el nombre real, permite cambiar explícitamente y recarga los datos al seleccionar otra barbería. Presenta errores de comunicación con opción de reintento.
- Login guarda una cookie de selección de tenant solo si corresponde a un workspace autorizado y activo; logout elimina tanto la sesión como esta cookie.
- `GET /api/v1/workspaces` valida la cookie contra los workspaces de sesión; recupera automáticamente la selección **solo si hay un único espacio activo**. Si hay varios, exige elección explícita.
- `POST /api/v1/workspaces/switch` valida JSON estricto, UUID y acceso real por cuenta, y emite cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- `requireStaffAdmin` resuelve sesiones antiguas con una sola barbería, pero valida siempre en PostgreSQL la membresía activa, el tenant BUSINESS activo y los roles OWNER/MANAGER; una cookie alterada nunca permite escalar privilegios.
- El resolvedor de espacios omite tenants suspendidos, prioriza OWNER/MANAGER sobre roles inferiores y evita sobrescribir privilegios reales cuando existe una afiliación profesional.
- Se conservan sin modificar los modelos de credenciales y las transacciones seguras que crean usuarios, memberships, perfiles de barbero y auditoría.

## Pruebas y evidencia

- `tests/workspace-staff-selection.test.ts`: **5/5 PASS**, incluyendo sesión anterior sin selección, login real con cookie, multi-tenant explícito, bloqueo de empleados/extraños y pertenencia segura.
- `tests/p0-staff-credentials.test.ts`: **2/2 PASS**, incluida contraseña aleatoria validada contra hash y aislamiento por tenant.
- Regresión completa después de la implementación: **449/449 PASS**, 62 suites.
- TypeScript: **PASS**.
- ESLint: **PASS**, cero errores y nueve advertencias preexistentes.
- Edge: propietario de una barbería creó barbero real desde formulario, recibió credenciales una sola vez, y se validó persistencia por API y PostgreSQL. Se probó igualmente el cambio de barbería con la espera de la respuesta de la API.
- No hubo migraciones ni se borraron datos reales. Solo se crearon fixtures sintéticos aislados para QA.
- Respaldo local de los ocho archivos afectados antes de modificar en `C:\MIVRA PROYECTS\BARBERIA\_fix_staff_workspace_20261013-1627` y respaldo de la caché fallida.
- La rama `main` no se modificó.

## Uso

1. Cierra sesión y vuelve a entrar: el login asignará tu barbería si tu cuenta tiene membresía activa.
2. Abre `/business/barberos` (propietario) o `/barber/barberos` (gerente autorizado).
3. Si administras varias barberías, elige la correcta en el selector de espacios de la cabecera.
4. Pulsa **Nuevo barbero**, registra nombre/correo y copia las credenciales seguras que aparecen una sola vez.

Si el selector dice «Sin barberías vinculadas», o aparece «Solo propietario o gerente», hace falta asociar o corregir los permisos reales de esa cuenta, no alterar la cookie manualmente.
