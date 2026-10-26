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
