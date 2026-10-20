import { sql } from '@vercel/postgres';
import type { JobApplication, InterviewStage, JobStatus, LogEntryType, ActivityLogEntry, ResumeFile, SalaryBand } from './types';

// Table names — prefix is set per environment via POSTGRES_TABLE_PREFIX (e.g. "jt_", "dev_")
const P = process.env.POSTGRES_TABLE_PREFIX ?? '';
const USERS = `${P}users`;
const JOBS = `${P}jobs`;
const RESUME_FILES = `${P}resume_files`;
const ACTIVITY_LOG = `${P}activity_log`;

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
  interview_stage: string | null;
  url: string | null;
  notes: string | null;
  resume_id: string | null;
  applied_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

interface LogEntryRow {
  id: string;
  job_id: string;
  user_id: string;
  type: string;
  content: string;
  from_status: string | null;
  to_status: string | null;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
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
    interviewStage: (row.interview_stage as InterviewStage) ?? undefined,
    url: row.url ?? undefined,
    notes: row.notes ?? undefined,
    resumeId: row.resume_id ?? undefined,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at ?? undefined,
  };
}

function rowToLogEntry(row: LogEntryRow): ActivityLogEntry {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.type as LogEntryType,
    content: row.content,
    fromStatus: (row.from_status as JobStatus) ?? undefined,
    toStatus: (row.to_status as JobStatus) ?? undefined,
    fromStage: (row.from_stage as InterviewStage) ?? undefined,
    toStage: (row.to_stage as InterviewStage) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Keys are column names. The description lives in `responsibilities`; `requirements` is legacy.
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
    interview_stage: job.interviewStage ?? null,
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
    `SELECT j.*, la.last_activity_at
     FROM ${JOBS} j
     LEFT JOIN (
       SELECT job_id, MAX(created_at) AS last_activity_at
       FROM ${ACTIVITY_LOG}
       GROUP BY job_id
     ) la ON la.job_id = j.id
     WHERE j.user_id = $1
     ORDER BY j.applied_at DESC`,
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
  const cols = Object.keys(p);
  await sql.query(
    `INSERT INTO ${JOBS} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(p)
  );
}

/**
 * Returns false when no job matched (missing or owned by someone else). When `logEntry` is given
 * it is inserted in the same statement, so the update and its log entry land together or not at all.
 */
export async function dbUpdateJob(
  job: JobApplication,
  userId: string,
  logEntry?: ActivityLogEntry
): Promise<boolean> {
  const { id, user_id, applied_at: _, ...fields } = jobToParams(job, userId);
  const cols = Object.keys(fields);
  const n = cols.length;
  const update = `UPDATE ${JOBS} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${n + 1} AND user_id = $${n + 2}
     RETURNING id`;
  const params = [...Object.values(fields), id, user_id];

  if (!logEntry) {
    const { rowCount } = await sql.query(update, params);
    return (rowCount ?? 0) > 0;
  }

  const l = (i: number) => `$${n + 3 + i}`;
  const { rows } = await sql.query<{ updated: boolean }>(
    `WITH upd AS (${update}),
     ins AS (
       INSERT INTO ${ACTIVITY_LOG} (id, job_id, user_id, type, content, from_status, to_status, from_stage, to_stage, created_at, updated_at)
       SELECT ${Array.from({ length: 11 }, (_, i) => l(i)).join(', ')} FROM upd
     )
     SELECT EXISTS (SELECT 1 FROM upd) AS updated`,
    [...params, logEntry.id, logEntry.jobId, userId, logEntry.type, logEntry.content,
     logEntry.fromStatus ?? null, logEntry.toStatus ?? null,
     logEntry.fromStage ?? null, logEntry.toStage ?? null,
     logEntry.createdAt, logEntry.updatedAt]
  );
  return rows[0].updated;
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

export async function dbGetResumeLabel(
  id: string,
  userId: string
): Promise<{ id: string; label: string } | undefined> {
  const { rows } = await sql.query<{ id: string; label: string }>(
    `SELECT id, label FROM ${RESUME_FILES} WHERE id = $1 AND user_id = $2`,
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

// ── Activity log (scoped by userId via JOIN) ──────────────────────────────────

export async function dbGetLogEntries(jobId: string, userId: string): Promise<ActivityLogEntry[]> {
  const { rows } = await sql.query<LogEntryRow>(
    `SELECT al.* FROM ${ACTIVITY_LOG} al
     JOIN ${JOBS} j ON j.id = al.job_id
     WHERE al.job_id = $1 AND j.user_id = $2
     ORDER BY al.created_at ASC`,
    [jobId, userId]
  );
  return rows.map(rowToLogEntry);
}

export async function dbInsertLogEntry(entry: ActivityLogEntry, userId: string): Promise<void> {
  await sql.query(
    `INSERT INTO ${ACTIVITY_LOG} (id, job_id, user_id, type, content, from_status, to_status, from_stage, to_stage, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [entry.id, entry.jobId, userId, entry.type, entry.content,
     entry.fromStatus ?? null, entry.toStatus ?? null,
     entry.fromStage ?? null, entry.toStage ?? null,
     entry.createdAt, entry.updatedAt]
  );
}

export async function dbUpdateLogEntry(id: string, jobId: string, userId: string, content: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { rowCount } = await sql.query(
    `UPDATE ${ACTIVITY_LOG} SET content = $1, updated_at = $2
     WHERE id = $3 AND job_id = $4 AND user_id = $5 AND type = 'note'`,
    [content, now, id, jobId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function dbDeleteLogEntry(id: string, jobId: string, userId: string): Promise<boolean> {
  const { rowCount } = await sql.query(
    `DELETE FROM ${ACTIVITY_LOG} WHERE id = $1 AND job_id = $2 AND user_id = $3 AND type = 'note'`,
    [id, jobId, userId]
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
