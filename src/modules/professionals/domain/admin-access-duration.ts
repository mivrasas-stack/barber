/** Fixed one-time access grants from the platform administrator. */
export type AdminAccessDuration = "DAY" | "MONTH" | "YEAR";

export function calculateAdminAccessEnd(start: Date, duration: AdminAccessDuration): Date {
  if (!Number.isFinite(start.getTime())) throw new Error("Invalid access start date");

  const end = new Date(start.getTime());
  if (duration === "DAY") {
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (duration === "MONTH" || duration === "YEAR") {
    const originalDay = end.getUTCDate();
    // Clamp end-of-month dates (Jan 31 -> Feb 28/29, Feb 29 -> Feb 28).
    end.setUTCDate(1);
    if (duration === "MONTH") end.setUTCMonth(end.getUTCMonth() + 1);
    else end.setUTCFullYear(end.getUTCFullYear() + 1);
    const daysInMonth = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)
    ).getUTCDate();
    end.setUTCDate(Math.min(originalDay, daysInMonth));
  } else {
    throw new Error("Unsupported access duration");
  }
  return end;
}
