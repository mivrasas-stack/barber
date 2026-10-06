# ADR-015: Suscripciones y Períodos de Prueba para Profesionales

## Context
Los profesionales independientes operan con flujos de caja y requerimientos comerciales distintos a las barberías tradicionales. Se requiere un modelo de monetización SaaS que permita autoservicio, planes diferenciados por audiencia y períodos de prueba gratuitos (trial) sin comprometer el cobro recurrente futuro en Stage 3.

## Decision
Crear el dominio de Suscripciones (`src/modules/subscriptions/`) con las tablas `subscription_plans` y `tenant_subscriptions`:
1. **Diferenciación por Audiencia (`subscription_plans.audience`):**
   - `SOLO_PROFESSIONAL`: Planes diseñados para profesionales individuales (`SOLO_STARTER`, `SOLO_PRO`, `SOLO_ELITE`).
   - `BUSINESS`: Planes diseñados para barberías tradicionales con equipos y multisede (`BUSINESS_BASIC`, `BUSINESS_SCALE`).
2. **Ciclo de Vida de la Suscripción (`tenant_subscriptions.status`):**
   - Al registrarse, el profesional entra en estado `TRIALING` con un período de prueba de 14 días (`trial_ends_at = startsAt + 14 días`), sin requerir tarjeta de crédito por adelantado.
   - Durante el período `TRIALING` y `ACTIVE`, la suscripción es totalmente operativa (`isOperational = true`), otorgando acceso a todos los módulos incluidos en el plan.
   - Estados contemplados: `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`.
3. **Desacoplamiento de Pagos:**
   - En este Stage 2.5 no se integran pasarelas de pago externas ni ledger contable (reservado para Stage 3). Los estados de suscripción se manejan a nivel de dominio y pueden ser extendidos administrativamente por Platform Admin.

## Alternatives
- **Sin suscripciones en Stage 2.5:** Rechazado. Provoca deuda técnica al tener que reestructurar la lógica de aprovisionamiento de tenants y resolución de módulos posteriormente.
- **Cobro obligatorio desde el día 1:** Rechazado. Dificulta la adopción y el autoservicio de barberos independientes.

## Consequences
- **Positivas:** Modelo comercial production-ready desde el primer día. Las métricas del SaaS (MRR proyectado, tasa de conversión de trial, usuarios activos) pueden calcularse directamente desde PostgreSQL.
- **Negativas:** Los clientes deben ser notificados al finalizar el período de prueba para renovar su servicio una vez implementado Stage 3.
