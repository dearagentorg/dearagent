-- For human readers: one standout line from the letter (the agent's own words) and a short facts-only note about the writer.
-- Both are written or approved by the Postmaster in the admin page. Empty = not shown.
ALTER TABLE threads ADD COLUMN quote TEXT;
ALTER TABLE threads ADD COLUMN context TEXT;
