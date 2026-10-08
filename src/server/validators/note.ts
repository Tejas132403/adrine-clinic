import { z } from "zod";
import { paginationQuerySchema } from "./common";

export const clinicalNoteSchema = z.object({
  appointmentId: z.string().uuid("Select the visit this note belongs to"),
  note: z
    .string()
    .trim()
    .min(5, "Clinical notes should be at least 5 characters")
    .max(4000, "Clinical note is too long"),
});

export const clinicalNoteQuerySchema = paginationQuerySchema;

export type ClinicalNoteInput = z.infer<typeof clinicalNoteSchema>;
