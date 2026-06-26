import Link from 'next/link';
import { getSession } from '@/lib/session';
import { Dashboard } from '@/components/Dashboard';
import { ArrowRight, Briefcase, Zap, DollarSign, FileText } from 'lucide-react';

export default async function Page() {
  const session = await getSession();
  if (session) return <Dashboard />;
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 px-4 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] bg-size-[40px_40px]"
        />
        <div className="relative mx-auto max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Job Tracker
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
            A simple tool for keeping track of job applications. Paste a job posting and Claude will pull out the details; otherwise just fill things in manually.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Create an account <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Briefcase size={20} />}
              title="Status tracking"
              description="Log applications and move them through stages — applied, interviewing, offer, rejected."
            />
            <FeatureCard
              icon={<Zap size={20} />}
              title="Paste to fill"
              description="Paste a job posting URL or raw text and Claude will extract the title, company, location, and salary."
            />
            <FeatureCard
              icon={<DollarSign size={20} />}
              title="Compensation"
              description="Record salary ranges so you can compare offers and keep the numbers in one place."
            />
            <FeatureCard
              icon={<FileText size={20} />}
              title="Job descriptions"
              description="Store the full job description alongside each application for easy reference."
            />
          </div>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
