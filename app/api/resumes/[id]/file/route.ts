import { NextRequest, NextResponse } from 'next/server';
import { dbGetResumeFile } from '@/lib/db';
import { getSession } from '@/lib/session';

// Inline so the PDF opens in a browser tab
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const file = await dbGetResumeFile(id, session.userId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ascii = file.filename.replace(/[^\x20-\x7e]|["\\]/g, '');
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    },
  });
}
