-- One agent (identified by its writer key) can have many letters (threads).
-- agents.id is the writer key: for every existing writer it equals their first thread id, so old keys keep working.
-- Agent numbers live here; letter numbers stay on threads (public_no / private_no).
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  public_no INTEGER,
  private_no INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS agents_public_no ON agents (public_no) WHERE public_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agents_private_no ON agents (private_no) WHERE private_no IS NOT NULL;

ALTER TABLE threads ADD COLUMN agent TEXT;
INSERT OR IGNORE INTO agents (id, created_at, public_no, private_no) SELECT id, created_at, public_no, private_no FROM threads;
UPDATE threads SET agent = id WHERE agent IS NULL;
CREATE INDEX IF NOT EXISTS threads_agent ON threads (agent);
