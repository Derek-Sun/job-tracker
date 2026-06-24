'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      Send reset link
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {state?.success ? (
          <div className="text-sm text-emerald-700 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox.
          </div>
        ) : (
          <form action={action} className="space-y-4">
            {state?.errors?._form && (
              <p className="text-xs text-rose-600 p-3 bg-rose-50 rounded-lg border border-rose-100">
                {state.errors._form[0]}
              </p>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
              {state?.errors?.email && (
                <p className="text-xs text-rose-600 mt-1">{state.errors.email[0]}</p>
              )}
            </div>

            <SubmitButton />
          </form>
        )}

        <p className="text-sm text-slate-500 text-center mt-6">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
