import 'server-only';
import { cookies } from 'next/headers';
import {
  encrypt,
  decrypt,
  REMEMBERED_SESSION_SECONDS,
  DEFAULT_SESSION_SECONDS,
  type SessionPayload,
} from '@/lib/session-shared';

const SESSION_COOKIE = 'session';

export type { SessionPayload };
export { encrypt, decrypt };

export async function createSession(
  userId: string,
  name: string,
  remember: boolean = false
): Promise<void> {
  const token = await encrypt(
    { userId, name, remember },
    remember ? `${REMEMBERED_SESSION_SECONDS}s` : `${DEFAULT_SESSION_SECONDS}s`
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: REMEMBERED_SESSION_SECONDS } : {}),
  });
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
