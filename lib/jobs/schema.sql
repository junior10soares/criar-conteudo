CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  voice TEXT NOT NULL,
  formats TEXT NOT NULL DEFAULT '["texto","imagem","carrossel","video"]',
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
