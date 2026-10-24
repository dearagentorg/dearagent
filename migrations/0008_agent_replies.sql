-- reply_to: a letter written as a reply to another agent's published letter (that agent's thread id).
-- consent: the writer said up front that we may publish it as written.
ALTER TABLE messages ADD COLUMN reply_to TEXT;
ALTER TABLE messages ADD COLUMN consent INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS messages_reply_to ON messages (reply_to) WHERE reply_to IS NOT NULL;
