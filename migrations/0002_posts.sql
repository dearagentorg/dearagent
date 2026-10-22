-- News posts created by the daily research run (the PC). Markdown files in content/articles still work too.
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,            -- 'brief' | 'article'
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,            -- YYYY-MM-DD
  body_md TEXT NOT NULL,
  items_json TEXT,               -- brief: [{title, summary, links:[{name,url}]}]
  sources_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,          -- 'draft' | 'published' | 'skipped'
  created_at TEXT NOT NULL,
  published_at TEXT,
  tg_message_id INTEGER
);
CREATE INDEX posts_status ON posts (status, type, date);
