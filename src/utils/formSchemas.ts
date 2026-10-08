import { z } from "zod";
import { GENDERS, PATIENT_STATUSES } from "@/types";
import { DATE_ONLY_PATTERN, TIME_PATTERN, parseDateOnly } from "@/utils/date";

/**
 * Client-side schemas for React Hook Form. They intentionally mirror the API
 * rules in src/server/validators so users get instant feedback - the server
 * remains the source of truth and rejects anything that slips through.
 */

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(60, `${label} must be at most 60 characters`)
    .regex(/^[\p{L}\s.'-]+$/u, `${label} cannot contain numbers or symbols`);

export const patientFormSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => DATE_ONLY_PATTERN.test(value) && parseDateOnly(value) !== null, "Enter a valid date")
    .refine((value) => {
      const parsed = parseDateOnly(value);
      return parsed ? parsed.getTime() <= Date.now() : false;
    }, "Date of birth cannot be in the future")
    .refine((value) => {
      const parsed = parseDateOnly(value);
      return parsed ? parsed.getUTCFullYear() >= 1900 : false;
    }, "Date of birth must be after 1900"),
  gender: z.enum(GENDERS, { message: "Select a gender" }),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[+()\d\s-]+$/, "Use digits, spaces and + ( ) - only")
    .refine((value) => (value.match(/\d/g) ?? []).length >= 8, "Include at least 8 digits"),
  email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]),
  address: z.string().trim().max(240, "Address is too long"),
  status: z.enum(PATIENT_STATUSES),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const appointmentFormSchema = z
  .object({
    patientId: z.string().min(1, "Select a patient"),
    doctorId: z.string().min(1, "Select a doctor"),
    appointmentDate: z
      .string()
      .min(1, "Select a date")
      .refine((value) => DATE_ONLY_PATTERN.test(value) && parseDateOnly(value) !== null, "Enter a valid date"),
    startTime: z.string().regex(TIME_PATTERN, "Select a start time"),
    endTime: z.string().regex(TIME_PATTERN, "Select an end time"),
    reason: z.string().trim().min(3, "Give a short reason for the visit").max(240, "Reason is too long"),
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time",
      });
    }
  });

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const clinicalNoteFormSchema = z.object({
  appointmentId: z.string().min(1, "Select the visit this note belongs to"),
  note: z.string().trim().min(5, "Clinical notes should be at least 5 characters").max(4000, "Note is too long"),
});

export type ClinicalNoteFormValues = z.infer<typeof clinicalNoteFormSchema>;
