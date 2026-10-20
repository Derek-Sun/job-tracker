import { NextResponse } from 'next/server';
import { dbGetLogEntries, dbInsertLogEntry, dbUpdateLogEntry, dbDeleteLogEntry } from '@/lib/db';
import { withSession } from '@/lib/api';
import type { ActivityLogEntry } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withSession<Ctx>(async (session, _req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await dbGetLogEntries(id, session.userId));
});

export const POST = withSession<Ctx>(async (session, req, { params }) => {
  const { id } = await params;
  const entry: ActivityLogEntry = await req.json();
  await dbInsertLogEntry(entry, session.userId);
  return NextResponse.json(entry, { status: 201 });
});

export const PATCH = withSession<Ctx>(async (session, req, { params }) => {
  await params;
  const { entryId, content }: { entryId: string; content: string } = await req.json();
  const ok = await dbUpdateLogEntry(entryId, session.userId, content);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = withSession<Ctx>(async (session, req, { params }) => {
  await params;
  const { entryId }: { entryId: string } = await req.json();
  const ok = await dbDeleteLogEntry(entryId, session.userId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
});
