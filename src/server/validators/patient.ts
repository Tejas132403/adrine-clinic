import { z } from "zod";
import { GENDERS, PATIENT_STATUSES } from "@/types";
import { DATE_ONLY_PATTERN, parseDateOnly } from "@/utils/date";
import { paginationQuerySchema } from "./common";

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(60, `${label} must be at most 60 characters`)
    .regex(/^[\p{L}\s.'-]+$/u, `${label} contains invalid characters`);

const phoneField = z
  .string()
  .trim()
  .min(8, "Phone number must be at least 8 digits")
  .max(20, "Phone number is too long")
  .regex(/^[+()\d\s-]+$/, "Phone number can only contain digits, spaces and + ( ) -")
  .refine((value) => (value.match(/\d/g) ?? []).length >= 8, "Phone number must contain at least 8 digits");

const dateOfBirthField = z
  .string()
  .refine((value) => DATE_ONLY_PATTERN.test(value), "Date of birth must use the yyyy-MM-dd format")
  .refine((value) => parseDateOnly(value) !== null, "Date of birth is not a valid calendar date")
  .refine((value) => {
    const parsed = parseDateOnly(value);
    return parsed ? parsed.getTime() <= Date.now() : false;
  }, "Date of birth cannot be in the future")
  .refine((value) => {
    const parsed = parseDateOnly(value);
    return parsed ? parsed.getUTCFullYear() >= 1900 : false;
  }, "Date of birth must be after 1900");

const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email address").max(120), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

const optionalAddress = z
  .union([z.string().trim().max(240, "Address is too long"), z.literal("")])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

/** Full patient payload - used for create and for PUT (full replace). */
export const patientSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  dateOfBirth: dateOfBirthField,
  gender: z.enum(GENDERS, { message: "Select a gender" }),
  phone: phoneField,
  email: optionalEmail,
  address: optionalAddress,
  status: z.enum(PATIENT_STATUSES).default("ACTIVE"),
});

/** Partial payload for PATCH-style edits. */
export const patientPatchSchema = patientSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update",
);

export const patientQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PATIENT_STATUSES).optional(),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "updatedAt"]).default("createdAt"),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
