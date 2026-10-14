import Link from 'next/link';
import { AuthCard } from '@/components/AuthForm';
import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const { token } = await searchParams;

  return (
    <AuthCard
      title="Set new password"
      subtitle="Choose a strong password for your account."
      footer={
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
    </AuthCard>
  );
}
