import { sql } from '@vercel/postgres';
import type { JobApplication, SalaryBand } from './types';

// Table names — prefix is set per environment via POSTGRES_TABLE_PREFIX (e.g. "jt_", "dev_")
const P = process.env.POSTGRES_TABLE_PREFIX ?? '';
const USERS = `${P}users`;
const JOBS = `${P}jobs`;

// ── Schema initialisation ────────────────────────────────────────────────────
// Runs once per cold start; subsequent calls reuse the resolved promise.

let schemaPromise: Promise<void> | null = null;

async function initSchema(): Promise<void> {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ${USERS} (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ${JOBS} (
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
}

function ensureSchema(): Promise<void> {
  if (!schemaPromise) schemaPromise = initSchema();
  return schemaPromise;
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

export async function dbCreateUser(user: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}): Promise<void> {
  await ensureSchema();
  await sql.query(
    `INSERT INTO ${USERS} (id, email, name, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [user.id, user.email, user.name, user.passwordHash, user.createdAt]
  );
}

export async function dbGetUserByEmail(email: string): Promise<UserRow | undefined> {
  await ensureSchema();
  const { rows } = await sql.query<UserRow>(`SELECT * FROM ${USERS} WHERE email = $1`, [email]);
  return rows[0];
}

export async function dbGetUserById(id: string): Promise<UserRow | undefined> {
  await ensureSchema();
  const { rows } = await sql.query<UserRow>(`SELECT * FROM ${USERS} WHERE id = $1`, [id]);
  return rows[0];
}

// ── Job CRUD (scoped by userId) ──────────────────────────────────────────────

export async function dbGetAllJobs(userId: string): Promise<JobApplication[]> {
  await ensureSchema();
  const { rows } = await sql.query<JobRow>(
    `SELECT * FROM ${JOBS} WHERE user_id = $1 ORDER BY applied_at DESC`,
    [userId]
  );
  return rows.map(rowToJob);
}

export async function dbGetJob(id: string, userId: string): Promise<JobApplication | undefined> {
  await ensureSchema();
  const { rows } = await sql.query<JobRow>(
    `SELECT * FROM ${JOBS} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

export async function dbInsertJob(job: JobApplication, userId: string): Promise<void> {
  await ensureSchema();
  const p = jobToParams(job, userId);
  await sql.query(
    `INSERT INTO ${JOBS}
      (id, user_id, title, company, location, salary_raw, salary_min, salary_max,
       salary_currency, salary_bands, responsibilities, requirements,
       status, url, notes, applied_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      p.id, p.user_id, p.title, p.company, p.location,
      p.salary_raw, p.salary_min, p.salary_max, p.salary_currency,
      p.salary_bands, p.responsibilities, p.requirements,
      p.status, p.url, p.notes, p.applied_at, p.updated_at,
    ]
  );
}

export async function dbUpdateJob(job: JobApplication, userId: string): Promise<void> {
  await ensureSchema();
  const p = jobToParams(job, userId);
  await sql.query(
    `UPDATE ${JOBS} SET
      title=$1, company=$2, location=$3,
      salary_raw=$4, salary_min=$5, salary_max=$6,
      salary_currency=$7, salary_bands=$8,
      responsibilities=$9, requirements=$10,
      status=$11, url=$12, notes=$13, updated_at=$14
     WHERE id=$15 AND user_id=$16`,
    [
      p.title, p.company, p.location,
      p.salary_raw, p.salary_min, p.salary_max,
      p.salary_currency, p.salary_bands,
      p.responsibilities, p.requirements,
      p.status, p.url, p.notes, p.updated_at,
      p.id, p.user_id,
    ]
  );
}

export async function dbDeleteJob(id: string, userId: string): Promise<void> {
  await ensureSchema();
  await sql.query(`DELETE FROM ${JOBS} WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function dbUpdatePassword(userId: string, passwordHash: string): Promise<void> {
  await ensureSchema();
  await sql.query(`UPDATE ${USERS} SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
}
