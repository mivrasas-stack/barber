/**
 * PostgreSQL can report either exclusion_violation (23P01) or a deadlock
 * (40P01) when many transactions contend for the same GiST booking slot.
 * Do not treat unrelated database deadlocks as booking conflicts.
 */
export function isAppointmentSlotConflictError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const pg = current as Record<string, unknown>;
    const code = typeof pg.code === "string" ? pg.code : "";
    const context = [pg.message, pg.detail, pg.where, pg.constraint]
      .filter((part): part is string => typeof part === "string")
      .join(" ");

    if (code === "23P01") return true;
    if (context.includes("appointments_no_double_booking")) return true;
    if (code === "40P01" &&
      /while checking exclusion constraint/i.test(context) &&
      /\bappointments\b/i.test(context)) return true;

    current = pg.cause;
  }
  return false;
}
