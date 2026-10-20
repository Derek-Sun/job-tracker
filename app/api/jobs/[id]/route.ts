import { NextResponse } from 'next/server';
import { dbGetJob, dbUpdateJob, dbDeleteJob, dbResumeFileExists } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { JobApplication, ActivityLogEntry } from '@/lib/types';
import { STATUS_LABELS, INTERVIEW_STAGE_LABELS } from '@/lib/types';

type Ctx = RouteContext<'/api/jobs/[id]'>;

export const PUT = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const body: JobApplication = await req.json();
  if (body.id !== id) return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
  if (body.resumeId && !(await dbResumeFileExists(body.resumeId, session.userId))) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
  }

  const oldJob = await dbGetJob(id, session.userId);
  if (!oldJob) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Auto-log status / interview stage changes; written atomically with the update
  let entry: ActivityLogEntry | undefined;
  const now = body.updatedAt;
  const statusChanged = body.status !== oldJob.status;
  const stageChanged = body.interviewStage !== oldJob.interviewStage;
  if (statusChanged) {
    entry = {
      id: crypto.randomUUID(),
      jobId: id,
      type: 'status_change',
      content: `${STATUS_LABELS[oldJob.status]} → ${STATUS_LABELS[body.status]}`,
      fromStatus: oldJob.status,
      toStatus: body.status,
      fromStage: oldJob.interviewStage,
      toStage: body.status === 'interview' ? body.interviewStage : undefined,
      createdAt: now,
      updatedAt: now,
    };
  } else if (stageChanged && body.interviewStage) {
    const fromLabel = oldJob.interviewStage ? INTERVIEW_STAGE_LABELS[oldJob.interviewStage] : 'None';
    entry = {
      id: crypto.randomUUID(),
      jobId: id,
      type: 'status_change',
      content: `Interview stage: ${fromLabel} → ${INTERVIEW_STAGE_LABELS[body.interviewStage]}`,
      fromStatus: body.status,
      toStatus: body.status,
      fromStage: oldJob.interviewStage,
      toStage: body.interviewStage,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (!(await dbUpdateJob(body, session.userId, entry))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(body);
});

export const DELETE = withSession<Ctx>(async (session, _req, { params }) => {
  const { id } = await params;
  await dbDeleteJob(id, session.userId);
  return new NextResponse(null, { status: 204 });
});
