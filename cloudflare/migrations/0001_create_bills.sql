CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  bill_json TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  last_modified TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS bills_expires_at_idx ON bills (expires_at);
CREATE INDEX IF NOT EXISTS bills_last_modified_idx ON bills (last_modified);
CREATE INDEX IF NOT EXISTS bills_status_idx ON bills (status);
