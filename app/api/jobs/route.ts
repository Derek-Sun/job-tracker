import { NextResponse } from 'next/server';
import { dbGetAllJobs, dbInsertJob, dbResumeFileExists } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { JobApplication } from '@/lib/types';

export const GET = withSession(async (session) => {
  return NextResponse.json(await dbGetAllJobs(session.userId));
});

export const POST = withSession(async (session, req) => {
  const job: JobApplication = await req.json();
  if (job.resumeId && !(await dbResumeFileExists(job.resumeId, session.userId))) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
  }
  await dbInsertJob(job, session.userId);
  return NextResponse.json(job, { status: 201 });
});
