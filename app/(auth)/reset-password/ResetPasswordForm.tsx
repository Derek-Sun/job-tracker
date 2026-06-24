'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      Set new password
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);

  if (!token) {
    return (
      <div className="text-sm text-rose-700 p-3 bg-rose-50 rounded-lg border border-rose-100">
        Missing reset token. Please use the link from your email.{' '}
        <Link href="/forgot-password" className="underline font-medium">
          Request a new one
        </Link>
        .
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.errors?._form && (
        <p className="text-xs text-rose-600 p-3 bg-rose-50 rounded-lg border border-rose-100">
          {state.errors._form[0]}
        </p>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        {state?.errors?.password && (
          <ul className="mt-1 space-y-0.5">
            {state.errors.password.map((e) => (
              <li key={e} className="text-xs text-rose-600">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
