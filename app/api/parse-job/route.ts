import { NextResponse } from 'next/server';
import { withSession } from '@/lib/api';
import { parseWithClaude } from '@/lib/claude-parser';

export const POST = withSession(async (_session, req) => {
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
    return NextResponse.json(await parseWithClaude(text));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Parse failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
