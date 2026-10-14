import { NextResponse } from 'next/server';
import { dbUpdateJob, dbDeleteJob, dbResumeFileExists } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { JobApplication } from '@/lib/types';

type Ctx = RouteContext<'/api/jobs/[id]'>;

export const PUT = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const body: JobApplication = await req.json();
  if (body.id !== id) return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
  if (body.resumeId && !(await dbResumeFileExists(body.resumeId, session.userId))) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
  }
  await dbUpdateJob(body, session.userId);
  return NextResponse.json(body);
});

export const DELETE = withSession<Ctx>(async (session, _req, { params }) => {
  const { id } = await params;
  await dbDeleteJob(id, session.userId);
  return new NextResponse(null, { status: 204 });
});
