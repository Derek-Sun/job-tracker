# Job Tracker

> A simple tool for keeping track of job applications. Paste a job posting and Claude will pull out the details; otherwise just fill things in manually.

Live demo: [job-tracker.dereksun.net](https://job-tracker.dereksun.net)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Database | [Postgres](https://www.postgresql.org) via [@vercel/postgres](https://vercel.com/docs/storage/vercel-postgres) / [Neon](https://neon.tech) |
| AI Parsing | [Claude](https://anthropic.com) (Anthropic API) |
| Email | [Resend](https://resend.com) |
| Deployment | [Vercel](https://vercel.com) |

## Features

- Add and manage job applications with status tracking (applied, interviewing, offer, rejected, etc.)
- Paste raw job posting text and let Claude parse out the role, company, location, and other details automatically
- Email-based password reset via Resend
- Postgres-backed storage, ready to deploy on Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up a Postgres database

The app uses [Neon](https://neon.tech) (or any Postgres-compatible provider supported by `@vercel/postgres`). Create a database and copy the connection string.

### 3. Configure environment variables

Create a `.env.local` file in the project root with the following variables:

```env
# Postgres connection string from your database provider
POSTGRES_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

# Prefix applied to all table names — use different values per environment to avoid collisions
# e.g. "dev_" for local, "prod_" for production
POSTGRES_TABLE_PREFIX=jt_dev_

# Anthropic API key — used by the Claude parser to extract job details from pasted text
ANTHROPIC_API_KEY=sk-ant-...

# Resend API key — used to send password reset emails
RESEND_API_KEY=re_...

# The "from" address used in outgoing emails
EMAIL_FROM=JobTracker <noreply@yourdomain.com>

# Public URL of the app — used to construct links in emails
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Secret used to sign session cookies — generate with: openssl rand -base64 32
SESSION_SECRET=<random-base64-string>
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

The app is designed to deploy on [Vercel](https://vercel.com). Set the environment variables above in your Vercel project settings, using a production Postgres URL and a separate `POSTGRES_TABLE_PREFIX` (e.g. `jt_prod_`) to keep production and dev data isolated.
