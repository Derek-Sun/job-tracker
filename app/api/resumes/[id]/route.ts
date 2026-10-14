import { NextResponse } from 'next/server';
import { dbDeleteResumeFile, dbRenameResumeFile } from '@/lib/db';
import { withSession } from '@/lib/api';

type Ctx = RouteContext<'/api/resumes/[id]'>;

export const PATCH = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  if (!label || label.length > 100) {
    return NextResponse.json({ error: 'Name must be 1–100 characters' }, { status: 400 });
  }

  const found = await dbRenameResumeFile(id, session.userId, label);
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id, label });
});

function inUse(jobCount?: number) {
  const which = jobCount ? `${jobCount} job${jobCount === 1 ? '' : 's'}` : 'a job';
  return NextResponse.json(
    { error: `Used by ${which}. Change ${jobCount === 1 ? 'that job\'s' : 'those jobs\''} resume first.` },
    { status: 409 }
  );
}

export const DELETE = withSession<Ctx>(async (session, _req, { params }) => {
  const { id } = await params;
  try {
    const result = await dbDeleteResumeFile(id, session.userId);
    if (result.status === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.status === 'in_use') return inUse(result.jobCount);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    // A job was linked between the check and the delete; the foreign key refused it
    if ((err as { code?: string })?.code === '23503') return inUse();
    throw err;
  }
});
