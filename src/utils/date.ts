/**
 * Date and time helpers.
 *
 * Convention used across the app: a calendar date is stored as a DATE column
 * and represented in code as UTC midnight of that clinic-local day
 * (`2026-10-08T00:00:00.000Z`), while appointment times are clinic-local
 * "HH:mm" strings. This keeps scheduling exact and free of timezone drift.
 */

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Today's clinic-local calendar date, as a date-only Date (UTC midnight). */
export function todayDateOnly(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Parse a `yyyy-MM-dd` string into a date-only Date, or null when invalid. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects impossible dates such as 2026-02-31.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/** Serialise a date-only Date to `yyyy-MM-dd`. */
export function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Add days to a date-only Date. */
export function addDays(value: Date, days: number): Date {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Compare two date-only values (negative when a is earlier). */
export function compareDateOnly(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

/** "HH:mm" -> minutes since midnight. Returns null for malformed input. */
export function timeToMinutes(time: string): number | null {
  if (!TIME_PATTERN.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}

/** Minutes since midnight -> "HH:mm". */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Duration in minutes between two "HH:mm" values, or null when invalid. */
export function durationInMinutes(startTime: string, endTime: string): number | null {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return null;
  return end - start;
}

/** Do two [start, end) ranges overlap? Adjacent slots (10:00-10:30, 10:30-11:00) do not. */
export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** "14:30" -> "2:30 PM" */
export function formatTime12h(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

/** Human label for a clinic-local "yyyy-MM-dd" string. */
export function formatDateLabel(dateOnly: string, options?: { withYear?: boolean }): string {
  const date = parseDateOnly(dateOnly);
  if (!date) return dateOnly;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: options?.withYear === false ? undefined : "numeric",
    timeZone: "UTC",
  });
}

/** Calendar age in years from a "yyyy-MM-dd" date of birth. */
export function ageFromDateOfBirth(dateOfBirth: string, now: Date = new Date()): number | null {
  const birth = parseDateOnly(dateOfBirth);
  if (!birth) return null;
  let age = now.getFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getUTCDate())) age -= 1;
  return age;
}

/** Approximate "yyyy-MM-dd" date of birth computed from age in years. */
export function dateOfBirthFromAge(age: number, now: Date = new Date()): string {
  const currentYear = now.getFullYear();
  const birthYear = currentYear - Math.max(0, Math.floor(age));
  const month = now.getMonth();
  const day = now.getDate();
  const maxDays = new Date(birthYear, month + 1, 0).getDate();
  const safeDay = Math.min(day, maxDays);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${birthYear}-${mm}-${dd}`;
}

/** ISO timestamp for a (date-only, "HH:mm") pair - used for sorting/labels only. */
export function combineDateTime(dateOnly: string, time: string): Date | null {
  const date = parseDateOnly(dateOnly);
  const minutes = timeToMinutes(time);
  if (!date || minutes === null) return null;
  return new Date(date.getTime() + minutes * 60_000);
}
