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
        {/* subtle grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] bg-size-[40px_40px]"
        />
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Free to use · No credit card required
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Your job search,{' '}
            <span className="text-indigo-600">finally organized.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
            Track every application through your pipeline. Auto-fill from any job posting URL. Never wonder where you stand again.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Get started free <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Already have an account →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Everything you need to run your search
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Briefcase size={20} />}
              title="Pipeline tracking"
              description="Move applications from Saved to Offer with one click. Filters and sorting keep everything in view."
            />
            <FeatureCard
              icon={<Zap size={20} />}
              title="Auto-fill from any URL"
              description="Paste a job posting URL and the title, company, location, salary, and description fill in automatically."
            />
            <FeatureCard
              icon={<DollarSign size={20} />}
              title="Compensation tracking"
              description="Log salary ranges, compare pay bands across roles, and keep the full comp picture in one place."
            />
            <FeatureCard
              icon={<FileText size={20} />}
              title="Full job descriptions"
              description="Store the cleaned job description alongside every application so the details are always at hand."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-100 bg-slate-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-12 text-xs font-semibold uppercase tracking-widest text-slate-400">
            How it works
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Add a job', body: 'Paste a posting URL or fill in the details manually. Fields auto-populate from the listing.' },
              { step: '2', title: 'Track your status', body: 'As you progress — phone screen, interview, offer — update the status with a single click.' },
              { step: '3', title: 'Stay on top', body: 'Your dashboard shows active applications, offers, and rejections so nothing slips through.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="text-left">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 text-center sm:px-6">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">Ready to get organized?</h2>
          <p className="mt-3 text-sm text-slate-500">Create your account in 30 seconds.</p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Get started free <ArrowRight size={15} />
          </Link>
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
