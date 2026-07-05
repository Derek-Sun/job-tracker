'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllJobs, deleteJob, updateJob } from '@/lib/storage';
import { JobTable } from '@/components/JobTable';
import { JobBoard } from '@/components/JobBoard';
import { ExportButton } from '@/components/ExportButton';
import type { JobApplication, JobStatus } from '@/lib/types';
import { Plus, Briefcase, TrendingUp, Trophy, XCircle, Table2, LayoutGrid } from 'lucide-react';

const VIEW_STORAGE_KEY = 'jobTracker:view';

export function Dashboard() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [view, setView] = useState<'table' | 'board'>('table');

  useEffect(() => {
    getAllJobs().then(setJobs);
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'table' || saved === 'board') setView(saved);
  }, []);

  function changeView(v: 'table' | 'board') {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  async function handleDelete(id: string) {
    await deleteJob(id);
    getAllJobs().then(setJobs);
  }

  async function handleStatusChange(id: string, status: JobStatus) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const updated = { ...job, status, updatedAt: new Date().toISOString() };
    setJobs(prev => prev.map(j => j.id === id ? updated : j));
    await updateJob(updated);
  }

  const active   = jobs.filter(j => ['applied', 'interview'].includes(j.status)).length;
  const offers   = jobs.filter(j => j.status === 'offer').length;
  const rejected = jobs.filter(j => j.status === 'rejected').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="mt-0.5 text-sm text-slate-500">Track and manage your job search</p>
        </div>
        <div className="flex items-center gap-3">
          {jobs.length > 0 && <ExportButton />}
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            <Plus size={15} /> Add Job
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total"    value={jobs.length} icon={<Briefcase size={16} />} color="slate" />
              <StatCard label="Active"   value={active}      icon={<TrendingUp size={16} />} color="indigo" />
              <StatCard label="Offers"   value={offers}      icon={<Trophy size={16} />}     color="emerald" />
              <StatCard label="Rejected" value={rejected}    icon={<XCircle size={16} />}    color="rose" />
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => changeView('table')}
                title="Table view"
                className={`rounded-md p-1.5 transition-colors ${
                  view === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Table2 size={15} />
              </button>
              <button
                onClick={() => changeView('board')}
                title="Board view"
                className={`rounded-md p-1.5 transition-colors ${
                  view === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
          {view === 'table' ? (
            <JobTable jobs={jobs} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ) : (
            <JobBoard jobs={jobs} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'slate' | 'indigo' | 'emerald' | 'rose';
}) {
  const styles = {
    slate:   { icon: 'bg-slate-100 text-slate-600',   value: 'text-slate-900' },
    indigo:  { icon: 'bg-indigo-50 text-indigo-600',  value: 'text-indigo-700' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
    rose:    { icon: 'bg-rose-50 text-rose-600',      value: 'text-rose-700' },
  }[color];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.icon}`}>{icon}</span>
      </div>
      <p className={`mt-2 text-3xl font-bold ${styles.value}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
        <Briefcase size={28} className="text-indigo-500" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-800">No applications yet</h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">
        Start tracking your job search by adding your first application.
      </p>
      <Link
        href="/jobs/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Plus size={15} /> Add your first job
      </Link>
    </div>
  );
}
