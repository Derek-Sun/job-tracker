'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JobForm } from '@/components/JobForm';
import { saveJob } from '@/lib/storage';
import { parseJobDescription } from '@/lib/parser';
import type { JobApplication } from '@/lib/types';
import type { StructuredJobFields } from '@/app/api/fetch-job/route';
import { newId } from '@/lib/utils';
import { ArrowLeft, Link2, Loader2 } from 'lucide-react';

export default function NewJobPage() {
  const router = useRouter();
  const [jobUrl, setJobUrl]     = useState('');
  const [fetchError, setFetchError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [parsed, setParsed]     = useState<Partial<JobApplication> | null>(null);

  function applyParsed(text: string, sourceUrl?: string, structured?: StructuredJobFields) {
    const result = parseJobDescription(text);
    setParsed({
      // Structured fields from JSON-LD take priority over regex-parsed values
      title: structured?.title || result.title,
      company: structured?.company || result.company,
      location: structured?.location || result.location,
      salary: result.salary,
      description: result.description,
      status: parsed?.status ?? 'applied',
      url: sourceUrl ?? parsed?.url,
    });
  }

  async function handleFetchUrl() {
    if (!jobUrl.trim()) return;
    setFetchError('');
    setFetching(true);
    try {
      const res = await fetch('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFetchError(data.error ?? 'Failed to fetch page'); return; }
      applyParsed(data.text, jobUrl.trim(), data.structured);
    } catch {
      setFetchError('Network error — could not reach the server');
    } finally {
      setFetching(false);
    }
  }

  async function handleSave(fields: Partial<JobApplication>) {
    const now = new Date().toISOString();
    await saveJob({
      id: newId(),
      title: fields.title ?? '',
      company: fields.company ?? '',
      location: fields.location,
      salary: fields.salary,
      description: fields.description ?? '',
      status: fields.status ?? 'applied',
      url: fields.url,
      notes: fields.notes,
      appliedAt: now,
      updatedAt: now,
    });
    router.push('/');
  }

  const inputCls = 'flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Add Application</h1>
      </div>

      {/* URL auto-fill */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Auto-fill from URL</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={jobUrl}
            onChange={e => { setJobUrl(e.target.value); setFetchError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
            placeholder="https://jobs.company.com/posting/…"
            className={inputCls}
          />
          <button
            onClick={handleFetchUrl}
            disabled={!jobUrl.trim() || fetching}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {fetching
              ? <><Loader2 size={14} className="animate-spin" /> Fetching…</>
              : <><Link2 size={14} /> Fetch</>}
          </button>
        </div>
        {fetchError && <p className="text-xs text-rose-600">{fetchError}</p>}
        <p className="text-xs text-slate-400">
          Works with Boeing, Greenhouse, Lever, Workday, Ashby, and most career pages. Paste the description below instead if blocked.
        </p>
      </div>

      {/* key forces JobForm to remount when parsed data changes */}
      <JobForm
        key={parsed ? JSON.stringify({ t: parsed.title, c: parsed.company, d: (parsed.description ?? '').slice(0, 30) }) : 'empty'}
        initial={parsed ?? { status: 'applied' }}
        onSave={handleSave}
        onParse={applyParsed}
        submitLabel="Save Application"
      />
    </div>
  );
}
