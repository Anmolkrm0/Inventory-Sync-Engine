export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

/**
 * Returns the timezone offset in milliseconds for a specific date in the given timezone.
 */
export function getTimezoneOffsetMs(date: Date, timeZone: string = APP_TIMEZONE): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Returns the UTC Date corresponding to midnight (00:00:00.000) of the given date in APP_TIMEZONE.
 */
export function getLocalMidnight(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // UTC midnight for those date parts
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  // Approximate offset and refine
  const offset = getTimezoneOffsetMs(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - offset);
}

/**
 * Returns the UTC Date corresponding to the start of the hour (HH:00:00.000) of the given date in APP_TIMEZONE.
 */
export function getLocalHourStart(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);

  // UTC timestamp for these local parts at minute 0, second 0, ms 0
  const utcHourStart = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  const offset = getTimezoneOffsetMs(new Date(utcHourStart), timeZone);
  return new Date(utcHourStart - offset);
}

/**
 * Creates a UTC Date representing a specific year, month (1-based), day, hour, and minute in APP_TIMEZONE.
 */
export function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  timeZone: string = APP_TIMEZONE
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = getTimezoneOffsetMs(new Date(utcMs), timeZone);
  return new Date(utcMs - offset);
}

/**
 * Formats a date into a localized time string in APP_TIMEZONE.
 */
export function formatInAppTimezone(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  timeZone: string = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...options,
  }).format(date);
}
