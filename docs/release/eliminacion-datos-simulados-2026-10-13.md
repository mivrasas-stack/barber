# Barber Paradise — Informe de eliminación de simulaciones visibles
Fecha: 13 de octubre de 2026

## Hallazgo
Un usuario recién creado veía un dashboard de demostración: las páginas de inicio de /barber, /business y /portal elegían explícitamente componentes de demo cuando NODE_ENV no era production. Las cabeceras utilizaban dummyBarbers[0]. Otras páginas con citas, contabilidad, rankings, reseñas o negocios ficticios quedaban bloqueadas solo en producción.

## Cambios aplicados
- Los tres portales muestran ahora enlaces a módulos operativos, sin dashboards sintéticos en ningún entorno.
- La identidad de las barras de /barber y /business procede de la sesión real validada por PostgreSQL en el layout de servidor; se retiró dummyBarbers[0].
- El filtro de launch-safety y middleware bloquea pantallas con información simulada también en localhost. Se amplió a /admin/audit, /admin/metrics, /admin/tenants, /admin/settings, /admin/subscriptions y rutas profesionales sin certificación.
- Los menús de administración, barbería, negocio y profesional ocultan esas rutas bloqueadas.
- El dashboard /professional obtiene el perfil, workspace y plan desde /api/v1/professionals/me. No muestra el barbero Carlos, ingresos ficticios, clientes inventados ni falsas citas.
- La portada web dejó de mostrar rankings, reseñas, portafolios, productos y tarifas de ejemplo. Los perfiles públicos de /directorio y /barbers/[id] muestran ahora un estado seguro, sin negocios ni estrellas inventados hasta que exista un directorio opt-in verificado.
- GET /api/auth/me devuelve Cache-Control: private, no-store.
- Se mantuvo el diseño oscuro/dorado en tarjetas de los accesos habilitados y los estados seguros.

## Lo que permanece conservado
Las pantallas heredadas y el archivo de datos dummy del frontend permanecen en el código como referencia histórica de diseño, pero están desconectados de las rutas activas o protegidos por middleware. NO se ha realizado una eliminación física indiscriminada del código de esos componentes para preservar el diseño anterior. Se recomienda conectar y revisar cada pantalla antes de rehabilitarla.

## Pruebas
- Suite integral de Vitest: 453 de 453 pruebas aprobadas en 63 archivos.
- Tests nuevos no-synthetic-account-data: dos usuarios nuevos independientes: identidad de sesión, espacios, reservas, relaciones y lealtad con valores de inicio correctos, sin datos ajenos.
- Seguridad de rutas demo: comprobada en desarrollo y en producción.
- TypeScript: PASS. ESLint: 0 errores, 9 advertencias no bloqueantes.
- Microsoft Edge en localhost: sesiones de propietario y dos clientes de prueba; paneles limpios, identidad correcta, cero historial para nuevos clientes, y bloqueo de rutas demo. Ver log local de QA.
- Build Linux Docker/Contabo: ver registro local docker-build.log del backup.

## Respaldo y precauciones
Respaldo íntegro previo a cambios:
C:\MIVRA PROYECTS\BARBERIA\_hardcoded_removal_safety_20261013
Incluye source-before-cleanup.tar, history-before-cleanup.bundle, before.index y estado de Git.
No hubo borrado de datos, tablas, migraciones, pagos reales ni reset de PostgreSQL. Las cuentas sintéticas utilizadas en QA quedan separadas de cuentas de negocio; su depuración futura requiere identificar filas y dependencias antes de borrar.

## Pendientes antes de producción
Las áreas bloqueadas deben reconstruirse sobre APIs reales por tenant (contabilidad, agenda administrativa, perfiles y ajustes, directorio opt-in, auditoría y suscripciones globales, varios módulos independientes). No se debe afirmar que esos módulos están terminados. También permanecen gates de Wompi, medios S3/R2 y hosting Contabo.

## Resultado
Corregida la filtración de datos simulados en los paneles y las rutas públicas comprobadas. La limpieza total del código demo sin uso requiere una fase de refactor posterior, no una eliminación de registros comerciales.
