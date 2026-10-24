-- Private writer numbers (#P1, #P2 ...): every real letter or private-note writer gets one on arrival.
-- Shown only to the owner and to the writer. A public number (public_no) is added when something of theirs goes live;
-- both stay on the thread, so #P1 stays linked to its later public number.
ALTER TABLE threads ADD COLUMN private_no INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS threads_private_no ON threads (private_no) WHERE private_no IS NOT NULL;
-- One existing writer was moved from a hand-set public number to private #P1 directly in the database (writer keys stay out of the repo).
