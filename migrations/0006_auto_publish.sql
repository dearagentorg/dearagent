-- When a news draft or tracker entry publishes by itself (unless the owner taps Hold in Telegram).
-- NULL = waits for a tap, as before.
ALTER TABLE posts ADD COLUMN auto_at TEXT;
ALTER TABLE incidents ADD COLUMN auto_at TEXT;
