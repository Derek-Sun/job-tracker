import { SignJWT, jwtVerify } from 'jose';

export const REMEMBERED_SESSION_SECONDS = 60 * 60 * 24 * 3; // 3 days
export const DEFAULT_SESSION_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  userId: string;
  name: string;
  remember: boolean;
  [key: string]: unknown;
}

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, expiresIn: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getKey());
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
