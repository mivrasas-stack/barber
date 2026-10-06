# ADR-009: Estrategia de Manejo de Zonas Horarias e Internacionalización

## Context
Barber Paradise atiende múltiples sedes y clientes que pueden encontrarse en distintas zonas horarias o interactuar desde dispositivos con configuraciones horarias variables. Almacenar fechas sin zona horaria (como cadenas locales o `timestamp without time zone`) provoca ambigüedad, errores en cambios de horario de verano (DST) y solapamientos corruptos.

## Decision
1. **Almacenamiento Canónico en UTC:**
   Todas las marcas de tiempo (`starts_at`, `ends_at`, `created_at`, `occurred_at`) se almacenan en PostgreSQL como `timestamp with time zone` (`timestamptz`), normalizadas invariablemente en UTC.
2. **Definición de Zona Horaria por Sede y Tenant:**
   Cada sede (`locations`) y tenant (`tenants`) posee un identificador IANA oficial (ej. `America/Bogota`, `America/Mexico_City`, `America/New_York`).
3. **Persistencia del Snapshot en la Cita:**
   Cada cita almacena en su columna `timezone` el IANA timezone efectivo en el momento de la reserva, protegiendo los cálculos y notificaciones contra futuras modificaciones de la sede.
4. **Cálculos Zoned Deterministas:**
   El módulo `src/shared/utils/date-tz.ts` utiliza la API nativa `Intl.DateTimeFormat` de Node.js para calcular conversiones exactas entre fecha/hora local (`YYYY-MM-DD` + `HH:mm`) y timestamp UTC instantáneo.

## Alternatives
- **Guardar timestamps en hora local:** Rechazado. Provoca desfases de horario insalvables cuando sedes de un mismo tenant operan en husos horarios diferentes.
- **Manejar offsets numéricos simples (ej. -05:00):** Rechazado. No contempla reglas de horario de verano ni cambios históricos de legislación de huso horario.

## Consequences
- **Positivas:** Consistencia matemática universal, interoperabilidad con calendarios externos (Google Calendar, iCal) e inmunidad ante configuraciones de cliente.
- **Negativas:** La interfaz de usuario debe traducir las horas a la zona horaria de la sede antes de presentarlas a los operadores.
