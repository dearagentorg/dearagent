-- A proposed change to an already-published tracker entry waits here until the owner taps Apply in Telegram.
ALTER TABLE incidents ADD COLUMN pending_json TEXT;
