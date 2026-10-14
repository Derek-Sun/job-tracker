'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobForm } from '@/components/JobForm';
import { BackLink } from '@/components/BackLink';
import { fetchJobFromUrl, parseJobText, saveJob } from '@/lib/storage';
import { INPUT } from '@/lib/styles';
import type { JobApplication, ParsedJob } from '@/lib/types';
import { cn, newId } from '@/lib/utils';
import { Link2, Loader2 } from 'lucide-react';

export default function NewJobPage() {
  const router = useRouter();
  const [jobUrl, setJobUrl]         = useState('');
  const [fetchError, setFetchError] = useState('');
  const [fetching, setFetching]     = useState(false);
  const [parsed, setParsed]         = useState<Partial<JobApplication> | null>(null);
  // Bumped on every parse so JobForm remounts with the new initial values
  const [formKey, setFormKey]       = useState(0);

  function applyParsed(result: ParsedJob, sourceUrl?: string) {
    setParsed({
      ...result,
      status: parsed?.status ?? 'applied',
      url: sourceUrl ?? parsed?.url,
    });
    setFormKey(k => k + 1);
  }

  async function handleFetchUrl() {
    const url = jobUrl.trim();
    if (!url) return;
    setFetchError('');
    setFetching(true);
    try {
      applyParsed(await fetchJobFromUrl(url), url);
    } catch (err) {
      // fetch() itself throws TypeError when the server is unreachable
      setFetchError(
        err instanceof Error && !(err instanceof TypeError)
          ? err.message
          : 'Network error — could not reach the server'
      );
    } finally {
      setFetching(false);
    }
  }

  async function handleParse(text: string) {
    applyParsed(await parseJobText(text));
  }

  async function handleSave(fields: Partial<JobApplication>) {
    const now = new Date().toISOString();
    await saveJob({
      title: '',
      company: '',
      description: '',
      status: 'applied',
      ...fields,
      id: newId(),
      appliedAt: now,
      updatedAt: now,
    });
    router.push('/');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <BackLink />
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
            className={cn(INPUT, 'flex-1')}
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

      <JobForm
        key={formKey}
        initial={parsed ?? { status: 'applied' }}
        onSave={handleSave}
        onParse={handleParse}
        submitLabel="Save Application"
      />
    </div>
  );
}
