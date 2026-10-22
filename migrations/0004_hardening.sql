-- Security review fixes (17 Oct 2026).
-- Telegram alert -> exact message, so /publish can't be swapped by a later follow-up.
ALTER TABLE tg_map ADD COLUMN message_id TEXT;
-- Machine translation of non-English notes, shown to the owner only.
ALTER TABLE messages ADD COLUMN body_en TEXT;
-- Stop recording when or how often a reference link is opened (privacy promise).
UPDATE threads SET checks = 0, last_checked_at = NULL;
UPDATE messages SET seen_at = NULL;
