'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { AuthCard, AuthField, FormError, SubmitButton } from '@/components/AuthForm';

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

      <FormError message={state?.errors?._form?.[0]} className="mb-4" />

      <form action={action} className="space-y-4">
        <AuthField id="email" label="Email" type="email" autoComplete="email" errors={state?.errors?.email} />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          errors={state?.errors?.password}
          labelExtra={
            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700">
              Forgot password?
            </Link>
          }
        />

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="rememberMe" className="rounded border-slate-300" />
          Remember me for 3 days
        </label>

        <SubmitButton>Sign in</SubmitButton>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to JobTracker"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Register
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
