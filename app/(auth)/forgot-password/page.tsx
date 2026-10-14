'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/auth';
import { AuthCard, AuthField, FormError, SubmitButton } from '@/components/AuthForm';

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Back to sign in
        </Link>
      }
    >
      {state?.success ? (
        <div className="text-sm text-emerald-700 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox.
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <FormError message={state?.errors?._form?.[0]} />
          <AuthField id="email" label="Email" type="email" autoComplete="email" autoFocus errors={state?.errors?.email} />
          <SubmitButton>Send reset link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
