import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { parseWithClaude } from '@/lib/claude-parser';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let text: string;
  try {
    const body = await req.json();
    text = typeof body.text === 'string' ? body.text : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  try {
    const parsed = await parseWithClaude(text);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Parse failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
