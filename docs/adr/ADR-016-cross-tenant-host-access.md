# ADR-016: Agendamiento Cross-Tenant y Concurrencia Multisede Anti Doble-Booking

## Context
Cuando un profesional independiente atiende físicamente dentro de una barbería anfitriona (Host A) o en múltiples barberías anfitrionas (Host A y Host B), surge una tensión arquitectónica crítica:
- ¿A qué tenant pertenece la cita?
- ¿Cómo se evita que dos clientes reserven al mismo profesional a la misma hora en dos barberías diferentes?
- ¿Cómo se protegen los datos comerciales para que Host A no acceda a las citas de Host B?

## Decision
1. **Casos de Agendamiento:**
   - **Caso A (Barbería Tradicional):** `appointment.tenant_id === location.tenant_id`. La barbería es tanto el dueño comercial como el dueño físico de la cita.
   - **Caso B (Profesional Independiente Afiliado):** `appointment.tenant_id !== location.tenant_id`. El dueño comercial de la cita es el Solo Workspace del profesional (`appointment.tenant_id = professional_workspace_tenant_id`), mientras que la ubicación física es la sede anfitriona (`appointment.location_id = host_location_id`).
   - El caso B solo se autoriza si existe una afiliación activa (`professional_affiliations.status = 'ACTIVE'`) y la sede física está dentro del alcance autorizado (`professional_affiliation_locations`).
2. **Autoridad Absoluta de Concurrencia con PostgreSQL GiST:**
   - La restricción de exclusión GiST implementada en Stage 2:
     ```sql
     EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
     WHERE (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));
     ```
   - Dado que el índice excluye colisiones sobre la columna escalar `staff_id` sin importar el `tenant_id` o `location_id`, **si un cliente intenta agendar a Carlos en Host A a las 16:00 y otro intenta agendar a Carlos en Host B o en su propio estudio a las 16:00, PostgreSQL bloquea y rechaza inmediatamente la segunda transacción con el error `23P01` (exclusion violation)**.
   - Probado con 50 peticiones simultáneas con exactamente 1 éxito y 49 rechazos 409.
3. **Propiedad y Aislamiento de Clientes:**
   - Al registrar una cita del Caso B, la relación con el cliente se almacena en `customer_relationships` a nombre del Solo Workspace. Si la afiliación con Host A finaliza, el profesional conserva intactos sus clientes y su historial.
   - Las consultas por tenant (`WHERE tenant_id = ?`) garantizan que Host A nunca pueda ver ni listar las citas comerciales de Host B.

## Alternatives
- **Duplicar el registro de cita en ambos tenants:** Rechazado. Provoca problemas graves de sincronización y doble contabilidad.
- **Sincronización asíncrona mediante cron jobs:** Rechazado. Permite ventanas de colisión donde el doble agendamiento ya ocurrió.

## Consequences
- **Positivas:** Seguridad matemática absoluta contra el doble agendamiento a nivel multisede. Soberanía comercial para el profesional y seguridad física para el anfitrión.
- **Negativas:** La consulta de disponibilidad (`GetAvailableSlots`) debe consultar las citas del barbero considerando su `staff_id` global.
