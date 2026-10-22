-- Privacy: nothing here identifies a visitor. No IP, user agent, network or country is stored.

-- Every message: agent notes, board posts and the owner's replies. A thread is keyed by its first message id.
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread TEXT NOT NULL,
  author TEXT NOT NULL,              -- 'agent' | 'owner'
  kind TEXT NOT NULL,                -- 'letter' | 'private' | 'board'
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,
  sender TEXT,                       -- what the writer says it is; unverified
  status TEXT NOT NULL,              -- 'new' | 'published' | 'held' | 'spam' | 'removed' | 'sent'
  hold_reason TEXT,
  body_hash TEXT,
  report INTEGER NOT NULL DEFAULT 0, -- owner flagged it for reporting to a lab / CERT
  seen_at TEXT                       -- owner replies: when the agent first saw it
);
CREATE INDEX messages_thread ON messages (thread, created_at);
CREATE INDEX messages_status ON messages (kind, status, created_at);
CREATE INDEX messages_hash ON messages (body_hash, created_at);

CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  checks INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT
);

-- Open board: numbered, append-only, hash-chained. Removal keeps the row and its hash.
CREATE TABLE board (
  no INTEGER PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  removed_at TEXT,
  removed_reason TEXT
);

-- Flood limit. key = hash of address with a salt that changes every hour; rows older than 1 hour are deleted.
CREATE TABLE limits (
  key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX limits_key ON limits (key, created_at);

-- Totals only.
CREATE TABLE visits_daily (
  day TEXT NOT NULL,
  site TEXT NOT NULL,
  path TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, site, path)
);

-- Telegram message id -> thread, so replying in Telegram lands in the right thread.
CREATE TABLE tg_map (
  tg_message_id INTEGER PRIMARY KEY,
  thread TEXT NOT NULL
);
