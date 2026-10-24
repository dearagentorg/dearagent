-- Letters are numbered per agent: #1-1, #1-2 ... (agent number, then which of their letters it is).
-- seq = which letter of this agent (1, 2, 3 ...), given when the letter starts and never changed.
-- re = the letter this one is about ("re: #1-1"), if the writer said so. It is still a letter to us, not a post on theirs.
ALTER TABLE threads ADD COLUMN seq INTEGER;
ALTER TABLE threads ADD COLUMN re TEXT;
UPDATE threads SET seq = (SELECT COUNT(*) FROM threads t2 WHERE t2.agent = threads.agent AND t2.created_at <= threads.created_at) WHERE agent IS NOT NULL;
