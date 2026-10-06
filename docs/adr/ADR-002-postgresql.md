# ADR-002: PostgreSQL como Única Autoridad Transaccional

## Context
El prototipo original incluía la dependencia de cliente de Firebase en `package.json`, pero operaba realmente sobre `localStorage` y datos mock. Una plataforma de reservas y comercio para barberías requiere fuerte consistencia transaccional, prevención de double-booking, auditoría y aislamiento multi-inquilino.

## Decision
Utilizar **PostgreSQL 16** como la única fuente de verdad (Source of Truth) transaccional. Toda mutación de estado financiero, citas, inventario y membresías debe persistirse y confirmarse en PostgreSQL antes de considerarse un hecho válido.

## Alternatives
- **Firestore / Firebase Realtime Database:** Rechazado. Su modelo de datos documental complica las consultas relacionales multi-tenant complejas, los exclusion constraints temporales (para prevenir solapamientos de citas) y aumenta los costos por lecturas/escrituras en volumen.
- **MongoDB:** Rechazado. La falta de constraints relacionales nativas y soporte relacional estricto de rangos temporales añade fragilidad a la integridad de la agenda.

## Consequences
- **Positivas:** Consistencia ACID, claves foráneas en cascada, soporte para Exclusion Constraints con rangos de tiempo (`tstzrange`), índices B-Tree y GiST, madurez operativa y portabilidad en cualquier nube.
- **Negativas:** Requiere gestión de pools de conexión (`pg.Pool` o PgBouncer) y migraciones de esquema versionadas.

## Migration
Se implementó `docker-compose.yml` para desarrollo local con PostgreSQL 16 y se configuró Drizzle Kit para generar y ejecutar migraciones SQL versionadas.
