/**
 * Timezone utilities for deterministic scheduling calculations
 */

export function parseLocalDateToUtc(
  dateStr: string, // "YYYY-MM-DD"
  timeStr: string, // "HH:mm"
  timeZone: string // e.g. "America/Bogota"
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  const targetYear = getPart("year");
  const targetMonth = getPart("month");
  const targetDay = getPart("day");
  let targetHour = getPart("hour");
  if (targetHour === 24) targetHour = 0;
  const targetMinute = getPart("minute");

  const targetAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
  const offsetMs = targetAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offsetMs);
}

export function getDayOfWeekFromDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export function formatTimeInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}
