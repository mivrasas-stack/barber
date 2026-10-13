# MIVRA Barber - Guia de variables .env (2026-10-09)

## Entregables

- `.env.production.example`: plantilla SIN secretos, versionada en Git.
- La configuracion privada REAL debe guardarse como `.env.production` y no debe compartirse ni subirse a Git.
- La configuracion local existente `.env` no se ha modificado.

## Proveedores y datos que debes conseguir

| Proveedor | Necesario | Variables | Donde se consigue |
| --- | --- | --- | --- |
| PostgreSQL | Si | DATABASE_URL; POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB si usas Compose | Tu servidor o proveedor de Postgres |
| Sesiones seguras | Si | AUTH_SECRET | Generala localmente y guardala solo en tu servidor |
| Dominio HTTPS | Si | NEXT_PUBLIC_APP_URL | Tu dominio y certificado TLS |
| Redis | Si | REDIS_URL o REDIS_HOST/REDIS_PORT/REDIS_PASSWORD | Tu Redis privado |
| Wompi Colombia | Para cobros | WOMPI_ENVIRONMENT, WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET | Panel de comercio de Wompi; sandbox primero |
| Cloudflare R2 o Amazon S3 | Para imagenes | MEDIA_STORAGE_PROVIDER, MEDIA_STORAGE_BUCKET, MEDIA_STORAGE_REGION, MEDIA_STORAGE_ENDPOINT, MEDIA_STORAGE_ACCESS_KEY_ID, MEDIA_STORAGE_SECRET_ACCESS_KEY, MEDIA_PUBLIC_CDN_URL | Proveedor de almacenamiento |
| Resend | Opcional: email | RESEND_API_KEY, RESEND_FROM_EMAIL | Resend; verificar dominio |
| Twilio | Opcional: SMS/WhatsApp | TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM | Twilio; configurar remitentes |
| Google Gemini | Opcional: flujo IA de imagenes | GOOGLE_GENAI_API_KEY | Google AI Studio / credenciales del proyecto |

El sistema actual implementa Wompi y un proveedor TEST deshabilitado en NODE_ENV=production. No hay evidencias de integracion de Stripe, PayU o Mercado Pago en este backend.

## Preparacion (PowerShell)

1. En una instalacion nueva copia el ejemplo: `Copy-Item .env.production.example .env.production`.
2. Rellena con credenciales verdaderas en el servidor, no en este chat.
3. Comprueba campos con: `node scripts/check-production-env.mjs .env.production --compose`. Este chequeo es offline: NO valida credenciales ni pagos reales.
4. Genera AUTH_SECRET sin reutilizar contrasenas: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
5. Coloca `NEXT_PUBLIC_APP_URL` y `REALTIME_ALLOWED_ORIGINS` con tu dominio real HTTPS.
6. Configura Wompi sandbox primero y registra el webhook `https://TU-DOMINIO/api/v1/payments/webhooks/wompi`.
7. En R2 configura el endpoint del account, bucket, credenciales y dominio CDN publico; comprueba CORS de subidas directas para el dominio de la app. En AWS S3 usa region real y no necesitas endpoint personalizado.
8. Configura `NOTIFICATION_DELIVERY_ENABLED=false` mientras Resend/Twilio no hayan pasado pruebas.
9. PostgreSQL y Redis deben quedar en red privada. El Compose local de desarrollo expone puertos; NO usarlo en Internet.

### Docker Compose

El archivo `docker-compose.production.yml` requiere POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB y REDIS_PASSWORD. Puedes ejecutar `docker compose --env-file .env.production -f docker-compose.production.yml config` (sin publicar valores ni capturas). Este Compose SOLO inicia PostgreSQL y Redis; Next.js y workers requieren configuracion adicional de red y procesos.

**Importante para workers:** Next.js lee .env.production, pero los procesos independientes de Node (outbox, realtime, notificaciones, media) deben recibir las MISMAS variables por el administrador de procesos, contenedores o carga explicita del archivo. No asumas que estos workers cargan .env.production automaticamente.

### Cobros reales

**NO LISTO para dinero real.** El build y 366 pruebas existentes estan aprobados, pero aun faltan pruebas E2E de compras, webhook firmado y conciliacion con Wompi sandbox, imagenes reales en S3/R2, vulnerabilidades altas/criticas detectadas, aislamiento de datos simulados, migraciones, backups y restauracion.

Deja `WOMPI_ENVIRONMENT=sandbox`. Al terminar los controles de aceptacion y usar claves de produccion, deberas cambiarlo expresamente a `production` y configurar el webhook de produccion en el panel del proveedor.

### Seguridad

Nunca incluyas credenciales reales en `.env.example`, commits, capturas o mensajes de chat. Protege `.env.production` con permisos de archivo adecuados. Si cualquier secreto se filtra, revocalo/rotalo. No expongas REDIS, PostgreSQL ni storage keys desde NEXT_PUBLIC_*; la clave publica de Wompi NO es un secreto; las claves privadas y secretos deben permanecer en servidor, que igualmente se inyecta desde backend donde corresponde.
