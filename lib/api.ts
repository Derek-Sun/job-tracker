import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import type { SessionPayload } from '@/lib/session-shared';

/** Wraps a route handler so it only runs for a signed-in user; otherwise responds 401. */
export function withSession<Ctx = unknown>(
  handler: (session: SessionPayload, req: NextRequest, ctx: Ctx) => Promise<Response>
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(session, req, ctx);
  };
}
