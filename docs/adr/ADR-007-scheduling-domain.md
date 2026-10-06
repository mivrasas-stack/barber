# ADR-007: Diseño del Dominio de Scheduling y Disponibilidad

## Context
La gestión de citas en Barber Paradise requiere calcular intervalos disponibles combinando los horarios comerciales de cada sede, las reglas de turno de cada barbero, las excepciones de calendario (bloqueos, vacaciones, pausas) y las citas activas existentes, respetando las duraciones y tiempos de amortiguación (buffers) de cada servicio del catálogo.

## Decision
Diseñar un bounded context `scheduling` desacoplado del catálogo y del personal:
1. Las sedes definen `location_business_hours` con soporte para apertura/cierre local por día de la semana.
2. Los barberos definen `availability_rules` recurrentes por sede y día de la semana, acotados por fechas de vigencia.
3. Se modelan `availability_exceptions` para bloqueos temporales, descansos o vacaciones.
4. El caso de uso `GetAvailableSlotsUseCase` computa la intersección matemática: Horarios de Sede ∩ Turno de Barbero ∖ Excepciones ∖ Citas Activas, generando slots discretos parametrizables (ej. cada 15 o 30 minutos).

## Alternatives
- **Cálculo de slots en el cliente:** Rechazado categóricamente. Abre vectores de discrepancia, consume datos innecesarios y carece de autoridad transaccional.
- **Pre-generación estática de slots en base de datos:** Rechazado. Generaría millones de filas innecesarias y requeriría constantes mutaciones y limpiezas en cancelaciones o cambios de turno.

## Consequences
- **Positivas:** El cálculo es bajo demanda, puro, determinista y altamente testeable sin efectos secundarios en la base de datos.
- **Negativas:** Requiere consultas eficientes con índices compuestos sobre `(staff_id, location_id, day_of_week)` y rangos de fechas.

## Migration
Cuando el volumen de consultas de disponibilidad crezca a decenas de miles de lecturas por minuto, los resultados de este cálculo se cachearán en Redis con invalidación reactiva mediante eventos de dominio.
