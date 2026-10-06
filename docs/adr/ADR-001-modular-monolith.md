# ADR-001: Adopción de Modular Monolith para Barber Paradise v2

## Context
El sistema Barber Paradise v1.0.0 era un prototipo frontend acoplado a datos estáticos y sin autoridad transaccional. La plataforma necesita evolucionar a un SaaS multi-tenant que soporte citas, pagos, inventario y tiempo real. Se evaluó si iniciar con microservicios o con un monolito modular.

## Decision
Adoptar una arquitectura **Modular Monolith** basada en dominios (Bounded Contexts) estrictamente delimitados (`identity`, `tenancy`, `authorization`, y a futuro `scheduling`, `commerce`, `realtime`). Todos los módulos comparten un único proceso y una única base de datos transaccional PostgreSQL en esta etapa.

## Alternatives
- **Microservicios distribuidos:** Rechazado. La sobrecarga de red, serialización, transacciones distribuidas (Saga/2PC) y complejidad de despliegue es excesiva para la fase inicial y aumentaría el riesgo de inconsistencia transaccional.
- **Monolito desestructurado (Spaghetti):** Rechazado. Provoca acoplamiento descontrolado donde los componentes visuales acceden directamente a las tablas de la base de datos sin límites de dominio.

## Consequences
- **Positivas:** Transacciones ACID nativas en PostgreSQL, tipos de TypeScript compartidos sin latencia de red, despliegue y desarrollo local simple (`docker-compose.yml`), alta velocidad de desarrollo.
- **Negativas:** Requiere disciplina de ingeniería estricta para evitar que un módulo importe detalles de infraestructura de otro módulo.

## Migration
Si en el futuro un módulo específico (ej. Procesamiento de Media o Notificaciones) experimenta cuellos de botella de CPU o escalado independiente, sus límites de dominio limpios permitirán extraerlo a un servicio separado sin reescribir la lógica de negocio.
