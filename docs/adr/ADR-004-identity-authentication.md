# ADR-004: Arquitectura de Identidad, Sesiones y Autenticación Server-Side

## Context
El prototipo original v1.0.0 tenía credenciales hardcodeadas en texto plano en `src/app/login/page.tsx` (`admin@test.com`, `employee@test.com`, password `123456`) y dependía de una cookie mutable desde el navegador (`document.cookie = "barberia_session=admin"`). Además, la ruta `/admin` estaba totalmente desprotegida por el middleware.

## Decision
1. Erradicar todas las credenciales hardcodeadas de la lógica de autenticación.
2. Utilizar hashing criptográfico de contraseñas con **bcryptjs** (10 salt rounds).
3. Implementar sesiones firmadas criptográficamente con tokens JWT emitidos mediante Web Crypto (**jose**) y respaldados en la tabla `sessions` de PostgreSQL para soportar revocación inmediata.
4. Establecer cookies de sesión con flags estrictos: `HttpOnly`, `Secure` (en producción), `SameSite=Lax`, `Path=/`, con expiración a 7 días.
5. Blindar el middleware de Next.js (`src/middleware.ts`) para verificar tokens y bloquear `/admin` exclusivamente a usuarios con `isPlatformAdmin === true`.

## Alternatives
- **Sesión de cliente en localStorage o cookies no-HttpOnly:** Rechazado. Vulnerable a ataques XSS y manipulación de privilegios por parte del cliente.
- **Firebase Auth únicamente:** Pospuesto. Aunque puede integrarse en el futuro como proveedor de identidad federado, la autoridad de memberships y permisos debe residir en PostgreSQL para no acoplar la autorización a claims de terceros.

## Consequences
- **Positivas:** Seguridad server-side intransigente, cookies invulnerables a manipulación en JavaScript del navegador, revocación de sesión en tiempo real contra la base de datos, protección total de `/admin`.
- **Negativas:** Requiere persistir y limpiar sesiones expiradas en base de datos.

## Migration
Se implementó `src/infrastructure/auth/session.ts`, endpoints `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, y se migró `src/app/login/page.tsx` para consumir la API real.
