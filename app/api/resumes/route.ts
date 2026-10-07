import { NextRequest, NextResponse } from 'next/server';
import { dbInsertResumeFile, dbListResumeFiles } from '@/lib/db';
import { getSession } from '@/lib/session';
import { MAX_RESUME_BYTES, type ResumeFile } from '@/lib/types';
import { newId } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await dbListResumeFiles(session.userId));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a PDF to upload' }, { status: 400 });
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: 'PDF is too large (4 MB max)' }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  // Check the content itself, not just the name or browser-reported type
  if (data.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return NextResponse.json({ error: 'That file isn\'t a PDF' }, { status: 400 });
  }

  const filename = file.name.trim() || 'resume.pdf';
  const rawLabel = form.get('label');
  const label = (typeof rawLabel === 'string' ? rawLabel.trim() : '') || filename.replace(/\.pdf$/i, '');

  const resume: ResumeFile = {
    id: newId(),
    label: label.slice(0, 100),
    filename,
    size: data.length,
    uploadedAt: new Date().toISOString(),
    jobCount: 0,
  };
  await dbInsertResumeFile({ ...resume, userId: session.userId, data });
  return NextResponse.json(resume, { status: 201 });
}
