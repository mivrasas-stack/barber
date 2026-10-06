# ADR-013: Relaciones de Afiliación Profesional y Alcance de Sedes

## Context
Los barberos independientes con frecuencia atienden físicamente dentro de barberías anfitrionas bajo acuerdos comerciales como alquiler de silla (chair rental), comisiones compartidas o guest spots. Se requiere un modelo formal que vincule al profesional independiente con la barbería anfitriona sin transferir la propiedad comercial del cliente ni subordinar al profesional como empleado de nómina.

## Decision
Modelar la relación entre el profesional independiente y la barbería anfitriona como un contrato explícito denominado **Afiliación Profesional** (`professional_affiliations`):
1. **Atributos de la Afiliación:**
   - `professional_workspace_tenant_id`: Identificador del Solo Workspace del profesional.
   - `host_tenant_id`: Identificador de la barbería anfitriona.
   - `relationship_type`: `CHAIR_RENTAL`, `COMMISSION`, `HYBRID`, `CONTRACTOR`, `GUEST`.
   - `status`: Máquina de estados finita (`REQUESTED` -> `ACTIVE`, `INVITED` -> `ACTIVE`, `ACTIVE` -> `SUSPENDED` / `ENDED`, `REJECTED`).
2. **Alcance Físico de Sedes (`professional_affiliation_locations`):**
   - Una barbería anfitriona multisede autoriza explícitamente en cuáles de sus ubicaciones físicas (`locations`) puede operar el profesional.
   - Intentar reservar una cita en una sede no autorizada genera un error `403 Forbidden` (`AFFILIATION_LOCATION_NOT_ALLOWED`).
3. **Términos Comerciales y Liquidación (`professional_affiliation_terms`):**
   - Registra el canon fijo de alquiler de silla (`fixed_rent_amount_minor`), la base de comisiones (`commission_basis_points`) y la frecuencia de liquidación.
4. **Membresía Anfitriona Aislada:**
   - Para permitir la operación diaria, el profesional recibe una membresía con rol `AFFILIATED_PROFESSIONAL` dentro de la barbería anfitriona, restringida mediante `membership_location_scopes` únicamente a las sedes aprobadas.

## Alternatives
- **Afiliación informal sin persistencia en base de datos:** Rechazado. Incapaz de controlar accesos físicos ni prevenir solapamiento de horarios.
- **Creación de una cuenta de usuario distinta por cada barbería donde atiende el profesional:** Rechazado. Fragmenta la identidad del barbero y obliga al usuario a gestionar múltiples correos y contraseñas.

## Consequences
- **Positivas:** Trazabilidad legal y comercial completa. Permite a un barbero operar en múltiples barberías anfitrionas con una sola cuenta y una única agenda global unificada.
- **Negativas:** La lógica de reserva debe validar el estado de la afiliación y la autorización de la sede antes de insertar cualquier cita.
