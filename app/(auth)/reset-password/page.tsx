import Link from 'next/link';
import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Set new password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a strong password for your account.</p>

        <ResetPasswordForm token={token ?? ''} />

        <p className="text-sm text-slate-500 text-center mt-6">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
