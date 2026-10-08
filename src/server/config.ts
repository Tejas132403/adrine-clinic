/**
 * Clinic-level business rules. Kept in one small module so the assumptions the
 * booking engine enforces (working hours, dashboard windows) are explicit and
 * easy to adjust during a review.
 */

export const CLINIC_HOURS = {
  open: "08:00",
  close: "20:00",
  label: "8:00 AM – 8:00 PM",
} as const;

/** Number of past days included in the dashboard "completed / cancelled" tiles. */
export const DASHBOARD_WINDOW_DAYS = 30;

/** Points on the dashboard activity chart (today plus the previous six days). */
export const ACTIVITY_CHART_DAYS = 7;

/** How many rows the dashboard "today's schedule" table shows. */
export const TODAY_SCHEDULE_LIMIT = 8;
