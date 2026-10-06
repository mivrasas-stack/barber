# ADR-003: Selección de Drizzle ORM y Drizzle Kit para Persistencia

## Context
Se requería una solución de persistencia TypeScript moderna, tipada y con bajo overhead para interactuar con PostgreSQL en un entorno Next.js y Node.js.

## Decision
Seleccionar **Drizzle ORM** con el driver nativo `pg` (`node-postgres`) y **Drizzle Kit** para la gestión de migraciones declarativas y versionadas en Git. Drizzle se confina estrictamente a la capa de infraestructura (`src/infrastructure/database/` y repositorios), sin invadir los modelos de dominio.

## Alternatives
- **Prisma:** Rechazado. Prisma añade un motor Rust binario pesado, mayor tiempo de inicio en frío en serverless, abstracción pesada de queries SQL y dificultades para ciertas extensiones nativas avanzadas de PostgreSQL.
- **TypeORM:** Rechazado. Modelo de decoradores anticuado, mutaciones implícitas y soporte deficiente para ESM moderno y TypeScript estricto.

## Consequences
- **Positivas:** Zero-overhead, consultas tipadas 1:1 con SQL estándar, migraciones en SQL puro auditables en PRs (`drizzle-kit generate`), soporte nativo para pools de conexión sin motores binarios externos.
- **Negativas:** Requiere definir explícitamente los esquemas TypeScript y mantener la separación entre `*Row` y las entidades de dominio.

## Migration
Se definieron los esquemas de tablas en `src/infrastructure/database/schema/`, el cliente singleton con pool en `client.ts`, y las migraciones SQL en `src/infrastructure/database/migrations/`.
