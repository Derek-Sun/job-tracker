import Database from 'better-sqlite3';
import path from 'path';
import type { JobApplication, SalaryBand } from './types';

const DB_PATH = path.join(process.cwd(), 'jobs.db');

declare global {
  // eslint-disable-next-line no-var
  var __jobsDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global.__jobsDb) {
    global.__jobsDb = new Database(DB_PATH);
    global.__jobsDb.pragma('journal_mode = WAL');
    global.__jobsDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL
      )
    `);
    global.__jobsDb.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL DEFAULT '',
        title            TEXT NOT NULL,
        company          TEXT NOT NULL,
        location         TEXT,
        salary_raw       TEXT,
        salary_min       INTEGER,
        salary_max       INTEGER,
        salary_currency  TEXT,
        salary_bands     TEXT NOT NULL DEFAULT '[]',
        responsibilities TEXT NOT NULL DEFAULT '',
        requirements     TEXT NOT NULL DEFAULT '',
        status           TEXT NOT NULL DEFAULT 'applied',
        url              TEXT,
        notes            TEXT,
        applied_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      )
    `);

    // Migrations for existing databases
    try {
      global.__jobsDb.exec(`ALTER TABLE jobs ADD COLUMN salary_bands TEXT NOT NULL DEFAULT '[]'`);
    } catch {}
    try {
      global.__jobsDb.exec(`ALTER TABLE jobs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`);
    } catch {}

    // Migrate responsibilities/requirements from JSON arrays to plain text
    const toMigrate = global.__jobsDb
      .prepare(`SELECT id, responsibilities, requirements FROM jobs WHERE responsibilities LIKE '[%' OR requirements LIKE '[%'`)
      .all() as Array<{ id: string; responsibilities: string; requirements: string }>;

    if (toMigrate.length > 0) {
      const updateStmt = global.__jobsDb.prepare(
        'UPDATE jobs SET responsibilities = ?, requirements = ? WHERE id = ?'
      );
      for (const row of toMigrate) {
        let resp = row.responsibilities;
        let reqs = row.requirements;
        try {
          const p = JSON.parse(resp);
          if (Array.isArray(p)) resp = p.join('\n');
        } catch {}
        try {
          const p = JSON.parse(reqs);
          if (Array.isArray(p)) reqs = p.join('\n');
        } catch {}
        updateStmt.run(resp, reqs, row.id);
      }
    }
  }
  return global.__jobsDb;
}

// ── Row ↔ Domain mappers ────────────────────────────────────────────────────

interface JobRow {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string | null;
  salary_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_bands: string;
  responsibilities: string;
  requirements: string;
  status: string;
  url: string | null;
  notes: string | null;
  applied_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

function rowToJob(row: JobRow): JobApplication {
  let bands: SalaryBand[] = [];
  try {
    const parsed = JSON.parse(row.salary_bands ?? '[]');
    if (Array.isArray(parsed)) bands = parsed;
  } catch {}

  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location ?? undefined,
    salary: row.salary_raw
      ? {
          raw: row.salary_raw,
          min: row.salary_min ?? undefined,
          max: row.salary_max ?? undefined,
          currency: row.salary_currency ?? undefined,
          bands: bands.length > 0 ? bands : undefined,
        }
      : undefined,
    description: [row.responsibilities, row.requirements].filter(s => s?.trim()).join('\n\n'),
    status: row.status as JobApplication['status'],
    url: row.url ?? undefined,
    notes: row.notes ?? undefined,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
  };
}

function jobToParams(job: JobApplication, userId: string) {
  return {
    id: job.id,
    user_id: userId,
    title: job.title,
    company: job.company,
    location: job.location ?? null,
    salary_raw: job.salary?.raw ?? null,
    salary_min: job.salary?.min ?? null,
    salary_max: job.salary?.max ?? null,
    salary_currency: job.salary?.currency ?? null,
    salary_bands: JSON.stringify(job.salary?.bands ?? []),
    responsibilities: job.description,
    requirements: '',
    status: job.status,
    url: job.url ?? null,
    notes: job.notes ?? null,
    applied_at: job.appliedAt,
    updated_at: job.updatedAt,
  };
}

// ── User CRUD ────────────────────────────────────────────────────────────────

export function dbCreateUser(user: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, user.email, user.name, user.passwordHash, user.createdAt);
}

export function dbGetUserByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function dbGetUserById(id: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

// ── Job CRUD (scoped by userId) ──────────────────────────────────────────────

export function dbGetAllJobs(userId: string): JobApplication[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY applied_at DESC')
    .all(userId) as JobRow[];
  return rows.map(rowToJob);
}

export function dbGetJob(id: string, userId: string): JobApplication | undefined {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?')
    .get(id, userId) as JobRow | undefined;
  return row ? rowToJob(row) : undefined;
}

export function dbInsertJob(job: JobApplication, userId: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO jobs
      (id, user_id, title, company, location, salary_raw, salary_min, salary_max, salary_currency,
       salary_bands, responsibilities, requirements, status, url, notes, applied_at, updated_at)
    VALUES
      (@id, @user_id, @title, @company, @location, @salary_raw, @salary_min, @salary_max, @salary_currency,
       @salary_bands, @responsibilities, @requirements, @status, @url, @notes, @applied_at, @updated_at)
  `).run(jobToParams(job, userId));
}

export function dbUpdateJob(job: JobApplication, userId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET
      title = @title, company = @company, location = @location,
      salary_raw = @salary_raw, salary_min = @salary_min, salary_max = @salary_max,
      salary_currency = @salary_currency, salary_bands = @salary_bands,
      responsibilities = @responsibilities, requirements = @requirements,
      status = @status, url = @url, notes = @notes, updated_at = @updated_at
    WHERE id = @id AND user_id = @user_id
  `).run(jobToParams(job, userId));
}

export function dbDeleteJob(id: string, userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?').run(id, userId);
}
