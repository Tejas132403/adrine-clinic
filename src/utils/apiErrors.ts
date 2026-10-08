import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/services/api";

/** Human-readable message for any thrown value. */
export function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Copies server-side field errors onto the matching react-hook-form fields.
 * Only the supplied field names are considered, so unknown keys from the API
 * can never register phantom errors.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!(error instanceof ApiError) || !error.fieldErrors) return;
  for (const field of fields) {
    const message = error.fieldErrors[field as string]?.[0];
    if (message) setError(field, { type: "server", message });
  }
}
