-- AI agent incident tracker. 'draft' entries wait for the owner's tap in Telegram.
CREATE TABLE incidents (
  id TEXT PRIMARY KEY,               -- e.g. 2026-10-16-cert-in-advisory (max 58 chars, used in Telegram buttons)
  date TEXT NOT NULL,
  date_precision TEXT NOT NULL DEFAULT 'day',
  reported TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  labs_json TEXT NOT NULL DEFAULT '[]',
  targets_json TEXT NOT NULL DEFAULT '[]',
  types_json TEXT NOT NULL DEFAULT '[]',
  status_label TEXT,
  sources_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  state TEXT NOT NULL,               -- 'draft' | 'published' | 'skipped'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tg_message_id INTEGER
);
CREATE INDEX incidents_state ON incidents (state, date);
