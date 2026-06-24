'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { createSession, deleteSession } from '@/lib/session';
import { dbCreateUser, dbGetUserByEmail, dbGetUserById, dbUpdatePassword } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const SignupSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).trim(),
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { message: 'Must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character.' }),
});

const LoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type AuthFormState =
  | { errors?: { name?: string[]; email?: string[]; password?: string[]; _form?: string[] } }
  | undefined;

export async function signup(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  if (await dbGetUserByEmail(email)) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const passwordHash = await bcryptjs.hash(password, 12);
  const id = crypto.randomUUID();
  await dbCreateUser({ id, email, name, passwordHash, createdAt: new Date().toISOString() });
  await createSession(id, name);
  redirect('/');
}

export async function login(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;
  const genericError = { errors: { _form: ['Invalid email or password.'] } };

  const user = await dbGetUserByEmail(email);
  if (!user) return genericError;

  const passwordMatch = await bcryptjs.compare(password, user.password_hash);
  if (!passwordMatch) return genericError;

  await createSession(user.id, user.name);
  redirect('/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}

// ── Password reset ────────────────────────────────────────────────────────────

const ForgotSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
});

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, { message: 'Must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { message: 'Must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character.' }),
});

export type ForgotFormState =
  | { success?: boolean; errors?: { email?: string[]; _form?: string[] } }
  | undefined;

export type ResetFormState =
  | { success?: boolean; errors?: { password?: string[]; _form?: string[] } }
  | undefined;

function getResetKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret + ':reset');
}

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function requestPasswordReset(
  prevState: ForgotFormState,
  formData: FormData
): Promise<ForgotFormState> {
  const validated = ForgotSchema.safeParse({ email: formData.get('email') });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email } = validated.data;
  const user = await dbGetUserByEmail(email);

  // Always show success to avoid leaking whether the email exists
  if (user) {
    const token = await new SignJWT({ userId: user.id, email, purpose: 'password-reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getResetKey());

    const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(email, resetUrl).catch((err) => {
      console.error('[password-reset] email send failed:', err);
    });
  }

  return { success: true };
}

export async function resetPassword(
  prevState: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const validated = ResetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { token, password } = validated.data;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getResetKey(), { algorithms: ['HS256'] });
    if (payload.purpose !== 'password-reset' || typeof payload.userId !== 'string') {
      throw new Error('Invalid token');
    }
    userId = payload.userId;
  } catch {
    return { errors: { _form: ['This reset link is invalid or has expired.'] } };
  }

  const user = await dbGetUserById(userId);
  if (!user) return { errors: { _form: ['Account not found.'] } };

  const passwordHash = await bcryptjs.hash(password, 12);
  await dbUpdatePassword(userId, passwordHash);

  redirect('/login?reset=1');
}
