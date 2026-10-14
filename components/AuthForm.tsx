'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function AuthCard({ title, subtitle, footer, children }: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        {children}
        <p className="text-sm text-slate-500 text-center mt-6">{footer}</p>
      </div>
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors"
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message, className = '' }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p className={`text-xs text-rose-600 p-3 bg-rose-50 rounded-lg border border-rose-100 ${className}`}>
      {message}
    </p>
  );
}

/** Shows only the first error unless `allErrors` (used for password rules). */
export function AuthField({ id, label, labelExtra, errors, allErrors, ...input }: {
  id: string;
  label: string;
  labelExtra?: React.ReactNode;
  errors?: string[];
  allErrors?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const shown = allErrors ? errors : errors?.slice(0, 1);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelExtra}
      </div>
      <input
        id={id}
        name={id}
        {...input}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
      />
      {shown && shown.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {shown.map((e) => (
            <li key={e} className="text-xs text-rose-600">{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
