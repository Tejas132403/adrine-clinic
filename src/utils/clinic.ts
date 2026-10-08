/**
 * Clinic rules the UI needs to surface (kept in step with
 * src/server/config.ts, which is what actually enforces them).
 */
export const CLINIC_HOURS = {
  open: "08:00",
  close: "20:00",
} as const;

export const CLINIC_HOURS_LABEL = "8:00 AM – 8:00 PM";
