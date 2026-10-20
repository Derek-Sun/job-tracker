import { NextResponse } from 'next/server';
import { dbGetJob, dbGetLogEntries, dbInsertLogEntry, dbUpdateLogEntry, dbDeleteLogEntry } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { ActivityLogEntry } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withSession<Ctx>(async (session, _req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await dbGetLogEntries(id, session.userId));
});

export const POST = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const body: ActivityLogEntry = await req.json();
  if (body.type !== 'note') {
    return NextResponse.json({ error: 'Only note entries can be created via this endpoint' }, { status: 400 });
  }
  if (!(await dbGetJob(id, session.userId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Take only the note's text from the client; everything else is set server-side
  const now = new Date().toISOString();
  const entry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    jobId: id,
    type: 'note',
    content: body.content,
    createdAt: now,
    updatedAt: now,
  };
  await dbInsertLogEntry(entry, session.userId);
  return NextResponse.json(entry, { status: 201 });
});

export const PATCH = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const { entryId, content }: { entryId: string; content: string } = await req.json();
  const ok = await dbUpdateLogEntry(entryId, id, session.userId, content);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const entryId = new URL(req.url).searchParams.get('entryId');
  if (!entryId) return NextResponse.json({ error: 'Missing entryId' }, { status: 400 });
  const ok = await dbDeleteLogEntry(entryId, id, session.userId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
});
