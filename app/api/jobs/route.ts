import { NextResponse } from 'next/server';
import { dbGetAllJobs, dbInsertJob, dbResumeFileExists } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { JobApplication, ActivityLogEntry } from '@/lib/types';

export const GET = withSession(async (session) => {
  return NextResponse.json(await dbGetAllJobs(session.userId));
});

export const POST = withSession(async (session, req) => {
  const { note, ...job }: JobApplication & { note?: string } = await req.json();
  if (job.resumeId && !(await dbResumeFileExists(job.resumeId, session.userId))) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
  }
  // Optional first note, saved with the job as an activity log entry
  const content = note?.trim();
  const entry: ActivityLogEntry | undefined = content
    ? { id: crypto.randomUUID(), jobId: job.id, type: 'note', content, createdAt: job.appliedAt, updatedAt: job.appliedAt }
    : undefined;
  await dbInsertJob(job, session.userId, entry);
  return NextResponse.json(job, { status: 201 });
});
