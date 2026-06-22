'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { JobApplication, JobStatus } from '@/lib/types';
import { STATUS_LABELS, STATUS_DOT } from '@/lib/types';
import { formatDate, formatSalary } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { Trash2, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Check } from 'lucide-react';

type SortKey = 'company' | 'title' | 'status' | 'appliedAt';

const STATUS_ORDER: JobStatus[] = [
  'saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn',
];

const ALL_STATUSES: (JobStatus | 'all')[] = ['all', ...STATUS_ORDER];

interface Props {
  jobs: JobApplication[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}

export function JobTable({ jobs, onDelete, onStatusChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('appliedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'appliedAt') {
      cmp = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    } else if (sortKey === 'status') {
      cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey]);
    }
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={13} className="text-slate-300" />;
    return sortAsc
      ? <ArrowUp size={13} className="text-indigo-500" />
      : <ArrowDown size={13} className="text-indigo-500" />;
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ALL_STATUSES.map(s => {
          const count = s === 'all' ? jobs.length : jobs.filter(j => j.status === s).length;
          if (count === 0 && s !== 'all') return null;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              <span className={`ml-1.5 ${active ? 'text-indigo-200' : 'text-slate-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No jobs match this filter.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="bg-slate-50">
                {([
                  ['company', 'Company'],
                  ['title', 'Title'],
                  ['status', 'Status'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 cursor-pointer select-none hover:text-slate-700"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {label} <SortIcon col={key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Salary
                </th>
                <th
                  onClick={() => toggleSort('appliedAt')}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 cursor-pointer select-none hover:text-slate-700"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Applied <SortIcon col="appliedAt" />
                  </span>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(job => (
                <tr key={job.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                    {job.company || <span className="italic text-slate-400">Unknown</span>}
                  </td>
                  <td className="px-4 py-3.5 max-w-xs">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                    >
                      {job.title}
                    </Link>
                    {job.location && (
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{job.location}</p>
                    )}
                  </td>

                  {/* Status cell with dropdown */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenId(openId === job.id ? null : job.id)}
                        className="inline-flex items-center gap-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        <StatusBadge status={job.status} />
                        <ChevronDown
                          size={11}
                          className={`text-slate-400 transition-transform ${openId === job.id ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {openId === job.id && (
                        <>
                          {/* backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenId(null)}
                          />
                          {/* menu */}
                          <div className="absolute left-0 top-full z-20 mt-1.5 min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {STATUS_ORDER.map(s => (
                              <button
                                key={s}
                                onClick={() => {
                                  onStatusChange(job.id, s);
                                  setOpenId(null);
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                                <span className={s === job.status ? 'font-medium text-slate-900' : ''}>
                                  {STATUS_LABELS[s]}
                                </span>
                                {s === job.status && (
                                  <Check size={12} className="ml-auto text-indigo-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap tabular-nums">
                    {formatSalary(job.salary)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap tabular-nums text-sm">
                    {formatDate(job.appliedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open posting"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${job.title}"?`)) onDelete(job.id);
                        }}
                        title="Delete"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-400">
        {sorted.length} of {jobs.length} application{jobs.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
