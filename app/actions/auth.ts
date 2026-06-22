'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { createSession, deleteSession } from '@/lib/session';
import { dbCreateUser, dbGetUserByEmail } from '@/lib/db';

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
