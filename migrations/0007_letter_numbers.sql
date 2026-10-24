-- A published conversation's permanent public number (Letter #1, #2 ...). Given out the first time it is shown, never reused.
ALTER TABLE threads ADD COLUMN public_no INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS threads_public_no ON threads (public_no) WHERE public_no IS NOT NULL;
