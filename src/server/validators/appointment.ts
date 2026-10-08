import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/types";
import { DATE_ONLY_PATTERN, durationInMinutes, parseDateOnly, TIME_PATTERN } from "@/utils/date";
import { paginationQuerySchema } from "./common";

const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 240;

const timeField = (label: string) =>
  z
    .string()
    .trim()
    .regex(TIME_PATTERN, `${label} must use the 24-hour HH:mm format`);

const dateField = z
  .string()
  .refine((value) => DATE_ONLY_PATTERN.test(value), "Date must use the yyyy-MM-dd format")
  .refine((value) => parseDateOnly(value) !== null, "Date is not a valid calendar date");

/**
 * Create/reschedule payload. Status is intentionally absent: status changes go
 * through the dedicated /cancel and /complete endpoints so the state machine
 * lives in one place.
 */
export const appointmentSchema = z
  .object({
    patientId: z.string().uuid("Select a patient"),
    doctorId: z.string().uuid("Select a doctor"),
    appointmentDate: dateField,
    startTime: timeField("Start time"),
    endTime: timeField("End time"),
    reason: z
      .string()
      .trim()
      .min(3, "Give a short reason for the visit")
      .max(240, "Reason must be at most 240 characters"),
  })
  .superRefine((value, ctx) => {
    const duration = durationInMinutes(value.startTime, value.endTime);
    if (duration === null) return;
    if (duration <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time",
      });
      return;
    }
    if (duration < MIN_DURATION_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: `An appointment must be at least ${MIN_DURATION_MINUTES} minutes long`,
      });
    }
    if (duration > MAX_DURATION_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: `An appointment cannot be longer than ${MAX_DURATION_MINUTES / 60} hours`,
      });
    }
  });

export const appointmentQuerySchema = paginationQuerySchema.extend({
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  /** Either `yyyy-MM-dd` or the literal `today`. */
  date: z
    .union([z.literal("today"), z.string().regex(DATE_ONLY_PATTERN, "Date must use the yyyy-MM-dd format")])
    .optional(),
  sortBy: z.enum(["appointmentDate", "createdAt", "startTime"]).default("appointmentDate"),
});

export const availabilityQuerySchema = z.object({
  doctorId: z.string().uuid("A valid doctorId is required"),
  date: z.string().regex(DATE_ONLY_PATTERN, "Date must use the yyyy-MM-dd format"),
  excludeAppointmentId: z.string().uuid().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
