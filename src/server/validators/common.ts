import { z } from "zod";

export const MAX_PAGE_SIZE = 100;

/** Shared pagination/sorting query schema; resources extend it with filters. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export function parseIdParam(value: string | undefined, label = "id"): string {
  const parsed = z.string().uuid(label ? `Invalid ${label}` : "Invalid id").safeParse(value);
  if (!parsed.success) {
    throw new Error("INVALID_ID");
  }
  return parsed.data;
}

/** uuid param schema used by route handlers. */
export const uuidSchema = z.string().uuid();
