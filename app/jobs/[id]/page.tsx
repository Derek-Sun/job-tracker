'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getJob, updateJob, deleteJob } from '@/lib/storage';
import { JobForm } from '@/components/JobForm';
import { StatusBadge } from '@/components/StatusBadge';
import type { JobApplication } from '@/lib/types';
import { formatDate, formatSalary } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, ExternalLink, X, DollarSign, FileText, StickyNote } from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob]         = useState<JobApplication | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getJob(id).then(found => {
      if (!found) router.replace('/');
      else setJob(found);
    });
  }, [id, router]);

  if (!job) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  async function handleSave(fields: Partial<JobApplication>) {
    const updated: JobApplication = { ...job!, ...fields, updatedAt: new Date().toISOString() };
    await updateJob(updated);
    setJob(updated);
    setEditing(false);
  }

  async function handleDelete() {
    if (confirm(`Delete "${job!.title}"?`)) {
      await deleteJob(job!.id);
      router.push('/');
    }
  }

  const hasBands = (job.salary?.bands?.length ?? 0) > 0;
  const hasDetails = job.salary || job.description?.trim() || job.notes;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Hero card */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">{job.company}</p>
            {job.location && <p className="mt-0.5 text-sm text-slate-400">{job.location}</p>}
            <p className="mt-3 text-xs text-slate-400">
              Applied {formatDate(job.appliedAt)}
              {job.updatedAt !== job.appliedAt && <> · Updated {formatDate(job.updatedAt)}</>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={12} /> Posting
              </a>
            )}
            <button
              onClick={() => setEditing(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                editing
                  ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {editing ? <><X size={12} /> Cancel</> : <><Pencil size={12} /> Edit</>}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Edit form or detail sections */}
      <div className="mt-5">
        {editing ? (
          <JobForm initial={job} onSave={handleSave} submitLabel="Save Changes" />
        ) : (
          <div className="space-y-4">
            {job.salary && (
              <div className={`grid gap-4 ${job.notes && !hasBands ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                <DetailCard icon={<DollarSign size={14} />} title="Salary">
                  {hasBands ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Level</th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Min</th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {job.salary.bands!.map((band, i) => (
                          <tr key={i}>
                            <td className="py-2 font-medium text-slate-800">{band.label}</td>
                            <td className="py-2 text-right tabular-nums text-slate-600">{fmtBand(band.min)}</td>
                            <td className="py-2 text-right tabular-nums text-slate-600">{fmtBand(band.max)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-slate-900">{formatSalary(job.salary)}</p>
                      {job.salary.raw && job.salary.raw !== formatSalary(job.salary) && (
                        <p className="mt-0.5 text-xs text-slate-400">Listed as: {job.salary.raw}</p>
                      )}
                    </>
                  )}
                </DetailCard>
                {job.notes && !hasBands && (
                  <DetailCard icon={<StickyNote size={14} />} title="Notes">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{job.notes}</p>
                  </DetailCard>
                )}
              </div>
            )}

            {job.description?.trim() && (
              <DetailCard icon={<FileText size={14} />} title="Job Description">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </DetailCard>
            )}

            {job.notes && (!job.salary || hasBands) && (
              <DetailCard icon={<StickyNote size={14} />} title="Notes">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{job.notes}</p>
              </DetailCard>
            )}

            {!hasDetails && (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">No details added yet.</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Add details →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtBand(n: number): string {
  return n >= 1000
    ? `$${n.toLocaleString()}`
    : `$${n}`;
}

function DetailCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          {icon}
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h2>
      </div>
      {children}
    </div>
  );
}
