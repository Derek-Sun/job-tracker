import 'server-only';
import { cookies } from 'next/headers';
import {
  encrypt,
  decrypt,
  sessionCookieOptions,
  SESSION_COOKIE,
  REMEMBERED_SESSION_SECONDS,
  DEFAULT_SESSION_SECONDS,
  type SessionPayload,
} from '@/lib/session-shared';

export async function createSession(
  userId: string,
  name: string,
  remember: boolean = false
): Promise<void> {
  const seconds = remember ? REMEMBERED_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const token = await encrypt({ userId, name, remember }, `${seconds}s`);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decrypt(token);
}
