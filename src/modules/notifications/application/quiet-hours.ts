import { parseLocalDateToUtc } from "@/shared/utils/date-tz";

export interface QuietHoursInput {
  enabled: boolean;
  start: string | null;
  end: string | null;
  timezone: string;
  now: Date;
  bypass?: boolean;
}

export type QuietHoursDecision =
  | {
      deferred: false;
    }
  | {
      deferred: true;
      nextAllowedAt: Date;
    };

interface ZonedDateParts {
  date: string;
  minutes: number;
}

function parseTimeMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function zonedParts(date: Date, timezone: string): ZonedDateParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value;

    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hourRaw = Number(get("hour"));
    const minute = Number(get("minute"));

    if (
      !year ||
      !month ||
      !day ||
      !Number.isFinite(hourRaw) ||
      !Number.isFinite(minute)
    ) {
      return null;
    }

    const hour = hourRaw === 24 ? 0 : hourRaw;

    return {
      date: `${year}-${month}-${day}`,
      minutes: hour * 60 + minute,
    };
  } catch {
    return null;
  }
}

function addLocalDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return [
    String(value.getUTCFullYear()).padStart(4, "0"),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function evaluateQuietHours(
  input: QuietHoursInput
): QuietHoursDecision {
  if (
    input.bypass ||
    !input.enabled ||
    !input.start ||
    !input.end
  ) {
    return { deferred: false };
  }

  const startMinutes = parseTimeMinutes(input.start);
  const endMinutes = parseTimeMinutes(input.end);
  const current = zonedParts(input.now, input.timezone);

  // Invalid user preference/timezone data must not permanently block
  // transactional delivery. Preference APIs will validate writes separately.
  if (
    startMinutes === null ||
    endMinutes === null ||
    !current ||
    startMinutes === endMinutes
  ) {
    return { deferred: false };
  }

  let isQuiet = false;
  let endDate = current.date;

  if (startMinutes < endMinutes) {
    isQuiet =
      current.minutes >= startMinutes && current.minutes < endMinutes;
  } else {
    isQuiet =
      current.minutes >= startMinutes || current.minutes < endMinutes;

    if (isQuiet && current.minutes >= startMinutes) {
      endDate = addLocalDays(current.date, 1);
    }
  }

  if (!isQuiet) {
    return { deferred: false };
  }

  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(
    2,
    "0"
  )}:${String(endMinutes % 60).padStart(2, "0")}`;

  return {
    deferred: true,
    nextAllowedAt: parseLocalDateToUtc(
      endDate,
      endTime,
      input.timezone
    ),
  };
}
