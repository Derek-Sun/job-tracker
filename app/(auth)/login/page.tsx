'use client';

import { Suspense, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { login } from '@/app/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      Sign in
    </button>
  );
}

function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const didReset = searchParams.get('reset') === '1';

  return (
    <>
      {didReset && (
        <p className="text-xs text-emerald-700 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          Password updated — sign in with your new password.
        </p>
      )}

      {state?.errors?._form && (
        <p className="text-xs text-rose-600 mb-4 p-3 bg-rose-50 rounded-lg border border-rose-100">
          {state.errors._form[0]}
        </p>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
          {state?.errors?.email && (
            <p className="text-xs text-rose-600 mt-1">{state.errors.email[0]}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
          {state?.errors?.password && (
            <p className="text-xs text-rose-600 mt-1">{state.errors.password[0]}</p>
          )}
        </div>

        <SubmitButton />
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Welcome back to JobTracker</p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-sm text-slate-500 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
