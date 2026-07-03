import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import type { ContentFormat, JobRecord, JobStage, JobStatus } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  var __cc_db: Database.Database | undefined;
}

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const schema = readFileSync(path.join(process.cwd(), "lib/jobs/schema.sql"), "utf-8");
  db.exec(schema);

  // Migração leve: bancos criados antes do campo `formats` existir.
  const columns = db.prepare("PRAGMA table_info(jobs)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "formats")) {
    db.exec(
      `ALTER TABLE jobs ADD COLUMN formats TEXT NOT NULL DEFAULT '["texto","imagem","carrossel","video"]'`
    );
  }

  return db;
}

export const db = globalThis.__cc_db ?? (globalThis.__cc_db = createDb());

interface JobRow {
  id: string;
  topic: string;
  voice: string;
  formats: string;
  status: JobStatus;
  stage: JobStage;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    topic: row.topic,
    voice: row.voice,
    formats: JSON.parse(row.formats) as ContentFormat[],
    status: row.status,
    stage: row.stage,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertJob(
  id: string,
  topic: string,
  voice: string,
  formats: ContentFormat[]
): JobRecord {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO jobs (id, topic, voice, formats, status, stage, created_at, updated_at)
     VALUES (@id, @topic, @voice, @formats, 'queued', 'queued', @now, @now)`
  ).run({ id, topic, voice, formats: JSON.stringify(formats), now });
  return getJob(id)!;
}

export function getJob(id: string): JobRecord | null {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function listJobs(): JobRecord[] {
  const rows = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all() as JobRow[];
  return rows.map(rowToJob);
}

export function nextQueuedJob(): JobRecord | null {
  const row = db
    .prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
    .get() as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function updateJobStage(id: string, stage: JobStage) {
  db.prepare("UPDATE jobs SET stage = ?, updated_at = ? WHERE id = ?").run(
    stage,
    new Date().toISOString(),
    id
  );
}

export function updateJobStatus(id: string, status: JobStatus, error: string | null = null) {
  db.prepare("UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?").run(
    status,
    error,
    new Date().toISOString(),
    id
  );
}
