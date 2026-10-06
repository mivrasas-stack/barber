# Barber Paradise v2 — Master SaaS Platform

Barber Paradise es una plataforma SaaS multi-tenant orientada a servicios (barberías, salones, spas) construida sobre una arquitectura de **Modular Monolith**, **PostgreSQL 16**, **Drizzle ORM**, **Next.js 15**, y autorización granular basada en roles (RBAC).

---

## 🏗️ Arquitectura de la Solución (Stage 0 & 1)

```text
Next.js Web / API Routes
         │
         ▼
Application Layer (Use Cases)
         │
         ▼
Domain Layer (Entities & Rules)
         │
         ▼
Repository Interfaces
         │
         ▼
Infrastructure Layer (Drizzle ORM & Postgres Driver)
         │
         ▼
PostgreSQL 16 (Source of Truth)
```

### Bounded Contexts Activos
- **Identity:** Gestión de usuarios, contraseñas criptográficas (bcryptjs) y sesiones revocables.
- **Tenancy:** Negocios (tenants) y sedes (locations) con aislamiento estricto y configuración IANA de zonas horarias.
- **Authorization:** Membresías M:N, roles (`OWNER`, `MANAGER`, `EMPLOYEE`), permisos granulares (`tenant.manage`, `appointments.read`, etc.), y contexto unificado (`AuthorizationContext`).

---

## 🚀 Inicio Rápido (Local Setup)

### 1. Prerrequisitos
- Node.js >= 20
- Docker y Docker Compose

### 2. Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

Configura tus credenciales en `.env`:
```env
DATABASE_URL="postgresql://barber_admin:barber_password_dev@localhost:5432/barber_paradise_db"
NODE_ENV="development"
AUTH_SECRET="development_secret_key_minimum_32_characters_for_jwt_session"
NEXT_PUBLIC_APP_URL="http://localhost:9002"
```

### 3. Levantar Base de Datos PostgreSQL
```bash
docker compose up -d
```
Verifica que el contenedor esté saludable:
```bash
docker ps -f name=barber_paradise_postgres
```

### 4. Migraciones y Seeds de Desarrollo
```bash
# Ejecutar migraciones SQL
npm run db:migrate

# Poblar con datos de desarrollo
npm run db:seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:9002`.

---

## 👥 Cuentas de Prueba (Semilla de Desarrollo)

Todas las cuentas de prueba tienen la contraseña: **`DevPassword123!`**

| Rol | Correo Electrónico | Alcance / Permisos | Redirección por Defecto |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@barberparadise.dev` | Acceso global a la plataforma SaaS | `/admin` |
| **Owner** | `owner@royalbarber.dev` | Dueño de *The Royal Barber Shop* | `/barber/admin` |
| **Manager** | `manager@royalbarber.dev` | Gerente operativo de sedes | `/barber/admin` |
| **Employee (Barber)**| `barber1@royalbarber.dev` | Barbero con agenda y cola | `/barber` |
| **Employee (Barber)**| `barber2@royalbarber.dev` | Barbero con agenda y cola | `/barber` |
| **Customer** | `customer@barberparadise.dev` | Cliente final del servicio | `/clientes` |

---

## 🛠️ Scripts Disponibles

```bash
# Base de datos
npm run db:generate   # Genera nuevas migraciones SQL a partir de esquemas TypeScript
npm run db:migrate    # Aplica las migraciones pendientes en PostgreSQL
npm run db:seed       # Siembra roles, permisos, tenant, sedes y usuarios de prueba
npm run db:studio     # Abre Drizzle Studio en el navegador

# Calidad y Pruebas
npm run typecheck     # Verificación estricta de TypeScript (sin ignorar errores)
npm run lint          # Análisis estático con Next.js ESLint
npm run test          # Ejecución de la suite de pruebas unitarias con Vitest
npm run build         # Compilación de producción optimizada de Next.js
```

---

## 🔒 Seguridad y Aislamiento Multi-Tenant

1. **Sin Credenciales Hardcodeadas:** Todo proceso de autenticación consulta la base de datos PostgreSQL mediante contraseñas hasheadas (`bcryptjs`).
2. **Cookies Seguras:** Las sesiones se almacenan en la cookie `barber_session` con atributos `HttpOnly`, `SameSite=Lax` y `Secure` (en producción), imposibles de manipular mediante scripts en el cliente.
3. **Ruta `/admin` Protegida:** El middleware (`src/middleware.ts`) valida criptográficamente el token y restringe el acceso al Platform Admin exclusivamente a usuarios con `isPlatformAdmin === true`.
4. **Aislamiento Cross-Tenant:** Un usuario que pertenece al Tenant A no puede consultar ni operar sobre recursos del Tenant B, verificado a nivel de dominio y probado en la suite automatizada (`tests/foundation.test.ts`).

---

## 📚 Decisiones Arquitectónicas (ADRs)
Consulta los registros formales de diseño en `docs/adr/`:
- [ADR-001: Modular Monolith](docs/adr/ADR-001-modular-monolith.md)
- [ADR-002: PostgreSQL como Source of Truth](docs/adr/ADR-002-postgresql.md)
- [ADR-003: Drizzle ORM y Drizzle Kit](docs/adr/ADR-003-drizzle-orm.md)
- [ADR-004: Identidad y Autenticación Server-Side](docs/adr/ADR-004-identity-authentication.md)
- [ADR-005: Multi-Tenancy Shared Database / Shared Schema](docs/adr/ADR-005-multi-tenancy.md)
- [ADR-006: Autorización RBAC Granular Desacoplada](docs/adr/ADR-006-authorization-rbac.md)
