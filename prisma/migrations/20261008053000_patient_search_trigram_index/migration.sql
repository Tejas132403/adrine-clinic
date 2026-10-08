-- Patient search: the list screen searches with case-insensitive partial matches
-- (e.g. "shar"), which a plain btree index cannot serve because of the leading
-- wildcard. pg_trgm indexes make that pattern index-assisted instead of a
-- sequential scan - the first thing that breaks at a million patients.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "patients_first_name_trgm_idx"
  ON "patients" USING gin ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "patients_last_name_trgm_idx"
  ON "patients" USING gin ("lastName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "patients_phone_trgm_idx"
  ON "patients" USING gin ("phone" gin_trgm_ops);
