import { NextRequest, NextResponse } from 'next/server';
import { dbGetAllJobs, dbInsertJob, dbResumeFileExists } from '@/lib/db';
import { getSession } from '@/lib/session';
import type { JobApplication } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobs = await dbGetAllJobs(session.userId);
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const job: JobApplication = await req.json();
  if (job.resumeId && !(await dbResumeFileExists(job.resumeId, session.userId))) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
  }
  await dbInsertJob(job, session.userId);
  return NextResponse.json(job, { status: 201 });
}
