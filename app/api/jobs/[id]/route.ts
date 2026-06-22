import { NextRequest, NextResponse } from 'next/server';
import { dbGetJob, dbUpdateJob, dbDeleteJob } from '@/lib/db';
import { getSession } from '@/lib/session';
import type { JobApplication } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = await dbGetJob(id, session.userId);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body: JobApplication = await req.json();
  if (body.id !== id) return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
  await dbUpdateJob(body, session.userId);
  return NextResponse.json(body);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await dbDeleteJob(id, session.userId);
  return new NextResponse(null, { status: 204 });
}
