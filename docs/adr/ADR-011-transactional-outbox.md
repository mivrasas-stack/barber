# ADR-011: Patrón Transactional Outbox para Propagación Confiable de Eventos

## Context
Cuando se crea una cita, se cancela o cambia de estado, el sistema necesitará desencadenar acciones asíncronas en fases posteriores (Stage 3 y Stage 4): enviar notificaciones push/email/SMS, publicar eventos de presencia y actualización en tiempo real (WebSockets / Server-Sent Events) y procesar pagos diferidos. Emitir estos eventos directamente a brokers externos (ej. Kafka, RabbitMQ, Redis PubSub) dentro de la transacción HTTP crea el problema de la "Doble Escritura" (Dual Write Problem): la base de datos puede hacer commit pero la red fallar, o la red publicar el evento pero la base de datos hacer rollback.

## Decision
Implementar el patrón **Transactional Outbox**:
1. Se define la tabla `outbox_events` con columnas `(id, event_id, event_type, event_version, tenant_id, location_id, aggregate_id, occurred_at, payload, status, created_at)`.
2. Todo caso de uso transaccional (ej. `CreateAppointmentUseCase`, `MutateAppointmentStatusUseCase`) inserta atómicamente el evento en `outbox_events` dentro de la **misma transacción relacional** de PostgreSQL que modifica el estado del negocio.
3. El estado inicial del evento es `PENDING`.
4. En Stage 4, un worker asíncrono (o lector de Logical Replication / Debezium / CDC) leerá los eventos pendientes, los publicará al broker/gateway en tiempo real con semántica "at-least-once" y los marcará como `PUBLISHED`.

## Alternatives
- **Disparo directo de eventos en memoria (EventEmitter de Node):** Rechazado. Los eventos se pierden si el proceso falla antes de su procesamiento.
- **Llamadas a servicios externos dentro de la transacción:** Rechazado. Provoca transacciones lentas, locks prolongados y fallas de consistencia transaccional.

## Consequences
- **Positivas:** Cero pérdida de eventos (garantía at-least-once), desacoplamiento total entre la lógica transaccional de scheduling y la infraestructura de mensajería/notificaciones.
- **Negativas:** Se requiere una tabla adicional en PostgreSQL y en fases posteriores un worker de lectura y publicación.
