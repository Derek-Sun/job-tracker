'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/app/actions/auth';
import { AuthField, FormError, SubmitButton } from '@/components/AuthForm';

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
      <FormError message={state?.errors?._form?.[0]} />
      <AuthField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        autoFocus
        errors={state?.errors?.password}
        allErrors
      />
      <SubmitButton>Set new password</SubmitButton>
    </form>
  );
}
