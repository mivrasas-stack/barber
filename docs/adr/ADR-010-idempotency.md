# ADR-010: Patrón de Idempotencia para Operaciones de Creación y Modificación

## Context
En conexiones de red inestables o bajo reintentos automáticos del navegador/móvil tras timeouts, un usuario puede enviar múltiples veces la misma petición de creación de cita. Sin control de idempotencia, esto podría causar cobros duplicados o confusión de citas múltiples accidentales.

## Decision
Implementar control de idempotencia a nivel de base de datos relacional mediante la tabla `idempotency_keys`:
1. El cliente o la API envía el encabezado `Idempotency-Key` (UUIDv4 o identificador único).
2. Se computa un hash criptográfico SHA-256 sobre el cuerpo canónico de la petición (`request_hash`).
3. La restricción de unicidad `UNIQUE(tenant_id, user_id, operation, key)` asegura exclusividad.
4. Ciclo de vida:
   - Registro con estado `PROCESSING`. Si entra otra petición idéntica mientras está en proceso, responde con `409 Conflict (IDEMPOTENT_OPERATION_IN_PROGRESS)`.
   - Al finalizar exitosamente la transacción, se actualiza a `COMPLETED` guardando el código de respuesta (`201`) y el payload de respuesta (`response_body`).
   - Las llamadas posteriores con la misma clave reciben inmediatamente la respuesta almacenada con código HTTP 200 y la bandera `isIdempotentReplay: true`, sin reinsertar en la base de datos ni provocar efectos secundarios.
   - Si la operación falla, se marca como `FAILED` para permitir reintentos corregidos.

## Alternatives
- **Idempotencia puramente en memoria:** Rechazado. Se pierde en reinicios del servidor y no escala ante múltiples réplicas del contenedor.
- **Sin idempotencia:** Rechazado. Inaceptable para un SaaS transaccional en producción.

## Consequences
- **Positivas:** Seguridad total ante reintentos de red y dobles clics de los usuarios.
- **Negativas:** Se requiere una consulta adicional y almacenamiento temporal con expiración de claves (`expires_at`, retención típica de 24 a 48 horas).
