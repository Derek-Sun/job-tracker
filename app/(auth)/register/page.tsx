'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signup } from '@/app/actions/auth';
import { AuthCard, AuthField, SubmitButton } from '@/components/AuthForm';

export default function RegisterPage() {
  const [state, action] = useActionState(signup, undefined);

  return (
    <AuthCard
      title="Create account"
      subtitle="Start tracking your job applications"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <AuthField id="name" label="Name" type="text" autoComplete="name" errors={state?.errors?.name} />
        <AuthField id="email" label="Email" type="email" autoComplete="email" errors={state?.errors?.email} />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          errors={state?.errors?.password}
          allErrors
        />
        <SubmitButton>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
