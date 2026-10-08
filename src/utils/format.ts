import { ageFromDateOfBirth, formatDateLabel, formatTime12h } from "@/utils/date";
import type { AppointmentStatus, Gender, PatientStatus } from "@/types";

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatGender(gender: Gender): string {
  switch (gender) {
    case "MALE":
      return "Male";
    case "FEMALE":
      return "Female";
    default:
      return "Other";
  }
}

export function formatPatientStatus(status: PatientStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    default:
      return "Archived";
  }
}

export function formatAppointmentStatus(status: AppointmentStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "COMPLETED":
      return "Completed";
    default:
      return "Cancelled";
  }
}

export function formatDate(dateOnly: string): string {
  return formatDateLabel(dateOnly, { withYear: true });
}

export function formatDateShort(dateOnly: string): string {
  return formatDateLabel(dateOnly, { withYear: false });
}

export function formatTime(time: string): string {
  return formatTime12h(time);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

export function formatAge(dateOfBirth: string): string {
  const age = ageFromDateOfBirth(dateOfBirth);
  return age === null ? "—" : `${age} yrs`;
}

/** "2 hours ago" style label used in note and activity feeds. */
export function formatRelative(isoTimestamp: string): string {
  const timestamp = new Date(isoTimestamp).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Today's clinic-local date in `yyyy-MM-dd`. */
export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
