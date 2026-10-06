# ADR-008: Prevención de Double-Booking y Control de Concurrencia en PostgreSQL

## Context
En plataformas de reservas, múltiples clientes pueden intentar agendar simultáneamente el mismo barbero y horario. Las verificaciones a nivel de aplicación (`SELECT ... WHERE NOT EXISTS ... INSERT`) sufren de condiciones de carrera (Race Conditions / Time-of-Check to Time-of-Use - TOCTOU) bajo concurrencia real, provocando citas solapadas (double-booking).

## Decision
Establecer a PostgreSQL 16 como la **autoridad absoluta** para el control de solapamiento temporal mediante la extensión `btree_gist` y una restricción de exclusión estricta (`EXCLUDE USING gist`):
```sql
ALTER TABLE appointments ADD CONSTRAINT appointments_no_double_booking
EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));
```
1. La semántica de intervalos es semiabierta `[starts_at, ends_at, '[)')`, permitiendo citas contiguas exactas (ej. 10:00–10:30 y 10:30–11:00) sin colisión.
2. La cláusula `WHERE` excluye citas con estado `CANCELLED` y `NO_SHOW`, liberando inmediatamente el slot sin eliminar el registro histórico ni requerir locks distribuidos.
3. El repositorio captura el código de error nativo `23P01` (`exclusion_violation`) y lo mapea de inmediato a `ConflictError('APPOINTMENT_SLOT_UNAVAILABLE')` (HTTP 409).
4. Para mutaciones de estado, se aplica bloqueo optimista mediante la columna `version` (`WHERE id = ? AND version = ?`), evitando colisiones de actualización simultánea.

## Alternatives
- **Locks distribuidos en Redis (Redlock):** Rechazado para esta fase. Introduce complejidad de particionamiento, split-brain y no sustituye la integridad relacional de la base de datos.
- **Verificación selectiva en aplicación:** Rechazado. Falla con 2 o más peticiones concurrentes en milisegundos idénticos.
- **SELECT FOR UPDATE:** Insuficiente para evitar inserciones de nuevas filas fantasma en rangos vacíos sin bloquear toda la tabla de appointments.

## Consequences
- **Positivas:** 100% de garantía matemática de cero double-booking a nivel de almacenamiento físico. Probado con 50 peticiones concurrentes idénticas resultando en exactamente 1 éxito y 49 rechazos 409.
- **Negativas:** La extensión `btree_gist` debe estar instalada en la base de datos PostgreSQL (`CREATE EXTENSION IF NOT EXISTS btree_gist`).
