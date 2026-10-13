# Auditoria incremental de seguridad - 2026-10-09

## Cambios tecnicos
- Next.js 15.3.8 -> 15.5.27; eslint-config-next alineado a 15.5.27.
- @types/node actualizado a la serie 22 para cumplir el peer de Vitest sin forzar dependencias.
- Eliminada la dependencia declarada "xlsx" sin correccion de seguridad automatica. La exportacion de la sala de espera ahora descarga CSV UTF-8 compatible con Excel, con neutralizacion de formulas y pruebas especificas.
- Wompi ahora rechaza en NODE_ENV=production configuraciones incompletas o con secretos de ejemplo. Se agregaron pruebas de esa regla.
- La rama de respaldo es backup/pre-security-audit-20261009.

## Evidencia obtenida
- TypeScript: npm run typecheck, exit 0 despues de recuperar el arbol de Next.js.
- Pruebas especificas: 4 archivos, 19 pruebas aprobadas, exit 0.
- Suite global: 47 archivos, 378 pruebas aprobadas, exit 0.
- Build ejecutado con Next.js 15.5.27 local: 127/127 paginas estaticas, exit 0; advertencias Edge/jose, img, fuentes y React Hooks pendientes.
- Docker de desarrollo aplicado: PostgreSQL y Redis healthy, puertos limitados a 127.0.0.1.

## Vulnerabilidades conocidas que bloquean produccion
Comparacion de npm audit --omit=dev:
- Antes: 5 criticas, 25 altas, 65 moderadas, 1 baja (96 total).
- Despues: 3 criticas, 26 altas, 67 moderadas, 1 baja (97 total).
- Siguen paquetes transitivos con avisos criticos como handlebars, proxy-addr y websocket-driver.
- Los numeros de npm audit no equivalen directamente a explotabilidad; hay que corregir y evaluar dependencias alcanzables.
- Ningun pago real, sandbox Wompi externo o prueba S3/R2 externa fue ejecutado en esta actualizacion.

## Go-live
NO-GO. Mantener Wompi en sandbox y no subir esta rama a produccion con clientes reales
hasta cerrar vulnerabilidades criticas/altas, certificacion E2E, datos simulados, S3/R2,
webhooks sandbox, respaldo/restauracion y despliegue de staging.

## Nota de dependencias Windows
Durante npm install un proceso de Next.js dev bloqueo next-swc.win32-x64-msvc.node.
Se detuvo temporalmente el dev server y se recupero el directorio completo de next@15.5.27
que npm habia apartado. Revisar npm ci limpio en un entorno aislado antes de publicar.
