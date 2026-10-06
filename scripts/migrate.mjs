// Schema setup — runs before every build (see "build" in package.json).
// Every statement is idempotent, so re-running against an up-to-date database is a no-op.
import { sql } from '@vercel/postgres';

if (!process.env.POSTGRES_URL) {
  console.error('db:migrate: POSTGRES_URL is not set (add it to .env.local or the environment)');
  process.exit(1);
}

// Table names — prefix is set per environment via POSTGRES_TABLE_PREFIX (e.g. "jt_", "dev_")
const P = process.env.POSTGRES_TABLE_PREFIX ?? '';
const USERS = `${P}users`;
const JOBS = `${P}jobs`;

const steps = [
  [`create ${USERS}`, `
    CREATE TABLE IF NOT EXISTS ${USERS} (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    )
  `],
  [`create ${JOBS}`, `
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
  `],
  // Status set was simplified from 7 values down to 4 — remap rows from any prior
  // deploy onto the closest surviving status.
  ['remap status saved → applied', `UPDATE ${JOBS} SET status = 'applied' WHERE status = 'saved'`],
  ['remap status phone_screen → interview', `UPDATE ${JOBS} SET status = 'interview' WHERE status = 'phone_screen'`],
  ['remap status withdrawn → rejected', `UPDATE ${JOBS} SET status = 'rejected' WHERE status = 'withdrawn'`],
  // Backs dbGetAllJobs: WHERE user_id = $1 ORDER BY applied_at DESC
  [`index ${JOBS}(user_id, applied_at)`, `CREATE INDEX IF NOT EXISTS ${JOBS}_user_applied_idx ON ${JOBS} (user_id, applied_at DESC)`],
];

for (const [label, query] of steps) {
  await sql.query(query);
  console.log(`db:migrate: ${label}`);
}
console.log('db:migrate: done');
