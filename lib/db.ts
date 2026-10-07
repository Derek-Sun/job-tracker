import { sql } from '@vercel/postgres';
import type { JobApplication, ResumeFile, SalaryBand } from './types';

// Table names — prefix is set per environment via POSTGRES_TABLE_PREFIX (e.g. "jt_", "dev_")
const P = process.env.POSTGRES_TABLE_PREFIX ?? '';
const USERS = `${P}users`;
const JOBS = `${P}jobs`;
const RESUME_FILES = `${P}resume_files`;

// Schema (tables, migrations, indexes) is managed by scripts/migrate.mjs, which runs on build.

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
  resume_id: string | null;
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
    resumeId: row.resume_id ?? undefined,
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
    resume_id: job.resumeId ?? null,
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
  await sql.query(
    `INSERT INTO ${USERS} (id, email, name, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [user.id, user.email, user.name, user.passwordHash, user.createdAt]
  );
}

export async function dbGetUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await sql.query<UserRow>(`SELECT * FROM ${USERS} WHERE email = $1`, [email]);
  return rows[0];
}

export async function dbGetUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await sql.query<UserRow>(`SELECT * FROM ${USERS} WHERE id = $1`, [id]);
  return rows[0];
}

// ── Job CRUD (scoped by userId) ──────────────────────────────────────────────

export async function dbGetAllJobs(userId: string): Promise<JobApplication[]> {
  const { rows } = await sql.query<JobRow>(
    `SELECT * FROM ${JOBS} WHERE user_id = $1 ORDER BY applied_at DESC`,
    [userId]
  );
  return rows.map(rowToJob);
}

export async function dbGetJob(id: string, userId: string): Promise<JobApplication | undefined> {
  const { rows } = await sql.query<JobRow>(
    `SELECT * FROM ${JOBS} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

export async function dbInsertJob(job: JobApplication, userId: string): Promise<void> {
  const p = jobToParams(job, userId);
  await sql.query(
    `INSERT INTO ${JOBS}
      (id, user_id, title, company, location, salary_raw, salary_min, salary_max,
       salary_currency, salary_bands, responsibilities, requirements,
       status, url, notes, resume_id, applied_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      p.id, p.user_id, p.title, p.company, p.location,
      p.salary_raw, p.salary_min, p.salary_max, p.salary_currency,
      p.salary_bands, p.responsibilities, p.requirements,
      p.status, p.url, p.notes, p.resume_id, p.applied_at, p.updated_at,
    ]
  );
}

export async function dbUpdateJob(job: JobApplication, userId: string): Promise<void> {
  const p = jobToParams(job, userId);
  await sql.query(
    `UPDATE ${JOBS} SET
      title=$1, company=$2, location=$3,
      salary_raw=$4, salary_min=$5, salary_max=$6,
      salary_currency=$7, salary_bands=$8,
      responsibilities=$9, requirements=$10,
      status=$11, url=$12, notes=$13, resume_id=$14, updated_at=$15
     WHERE id=$16 AND user_id=$17`,
    [
      p.title, p.company, p.location,
      p.salary_raw, p.salary_min, p.salary_max,
      p.salary_currency, p.salary_bands,
      p.responsibilities, p.requirements,
      p.status, p.url, p.notes, p.resume_id, p.updated_at,
      p.id, p.user_id,
    ]
  );
}

export async function dbDeleteJob(id: string, userId: string): Promise<void> {
  await sql.query(`DELETE FROM ${JOBS} WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function dbUpdatePassword(userId: string, passwordHash: string): Promise<void> {
  await sql.query(`UPDATE ${USERS} SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
}

// ── Resume files (scoped by userId) ──────────────────────────────────────────

export async function dbListResumeFiles(userId: string): Promise<ResumeFile[]> {
  const { rows } = await sql.query<{
    id: string; label: string; filename: string; size: number; uploaded_at: string; job_count: string;
  }>(
    `SELECT r.id, r.label, r.filename, r.size, r.uploaded_at, COUNT(j.id) AS job_count
       FROM ${RESUME_FILES} r
       LEFT JOIN ${JOBS} j ON j.resume_id = r.id
      WHERE r.user_id = $1
      GROUP BY r.id
      ORDER BY r.uploaded_at DESC`,
    [userId]
  );
  return rows.map(r => ({
    id: r.id,
    label: r.label,
    filename: r.filename,
    size: r.size,
    uploadedAt: r.uploaded_at,
    jobCount: Number(r.job_count),
  }));
}

export async function dbGetResumeFile(
  id: string,
  userId: string
): Promise<{ filename: string; data: Buffer } | undefined> {
  const { rows } = await sql.query<{ filename: string; data: Buffer }>(
    `SELECT filename, data FROM ${RESUME_FILES} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0];
}

export async function dbResumeFileExists(id: string, userId: string): Promise<boolean> {
  const { rows } = await sql.query(`SELECT 1 FROM ${RESUME_FILES} WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows.length > 0;
}

export async function dbInsertResumeFile(file: {
  id: string;
  userId: string;
  label: string;
  filename: string;
  data: Buffer;
  uploadedAt: string;
}): Promise<void> {
  await sql.query(
    `INSERT INTO ${RESUME_FILES} (id, user_id, label, filename, size, data, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [file.id, file.userId, file.label, file.filename, file.data.length, file.data, file.uploadedAt]
  );
}

export async function dbRenameResumeFile(id: string, userId: string, label: string): Promise<boolean> {
  const { rowCount } = await sql.query(
    `UPDATE ${RESUME_FILES} SET label = $1 WHERE id = $2 AND user_id = $3`,
    [label, id, userId]
  );
  return (rowCount ?? 0) > 0;
}

/** Refuses while any job records this resume, so the history of what was sent stays intact. */
export async function dbDeleteResumeFile(
  id: string,
  userId: string
): Promise<{ status: 'deleted' | 'not_found' } | { status: 'in_use'; jobCount: number }> {
  const { rows } = await sql.query<{ job_count: string }>(
    `SELECT COUNT(j.id) AS job_count
       FROM ${RESUME_FILES} r
       LEFT JOIN ${JOBS} j ON j.resume_id = r.id
      WHERE r.id = $1 AND r.user_id = $2
      GROUP BY r.id`,
    [id, userId]
  );
  if (!rows[0]) return { status: 'not_found' };
  const jobCount = Number(rows[0].job_count);
  if (jobCount > 0) return { status: 'in_use', jobCount };

  await sql.query(`DELETE FROM ${RESUME_FILES} WHERE id = $1 AND user_id = $2`, [id, userId]);
  return { status: 'deleted' };
}
