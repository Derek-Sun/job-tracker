'use client';

import { useState } from 'react';
import type { JobApplication, JobStatus, Salary, SalaryBand } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { Plus, X, Sparkles } from 'lucide-react';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as JobStatus[];

interface Props {
  initial: Partial<JobApplication>;
  onSave: (job: Partial<JobApplication>) => void | Promise<void>;
  onParse?: (text: string) => void;
  submitLabel?: string;
}

const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors';
const inputSm = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors';

interface BandEntry { label: string; min: string; max: string }

export function JobForm({ initial, onSave, onParse, submitLabel = 'Save' }: Props) {
  const [title, setTitle]           = useState(initial.title ?? '');
  const [company, setCompany]       = useState(initial.company ?? '');
  const [location, setLocation]     = useState(initial.location ?? '');
  const [url, setUrl]               = useState(initial.url ?? '');
  const [status, setStatus]         = useState<JobStatus>(initial.status ?? 'applied');
  const [salaryRaw, setSalaryRaw]   = useState(initial.salary?.raw ?? '');
  const [salaryMin, setSalaryMin]   = useState(initial.salary?.min?.toString() ?? '');
  const [salaryMax, setSalaryMax]   = useState(initial.salary?.max?.toString() ?? '');
  const [salaryBands, setSalaryBands] = useState<BandEntry[]>(
    initial.salary?.bands?.map(b => ({ label: b.label, min: b.min.toString(), max: b.max.toString() })) ?? []
  );
  const [description, setDescription] = useState(initial.description ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [saving, setSaving] = useState(false);

  function updateBand(i: number, field: keyof BandEntry, val: string) {
    const next = [...salaryBands];
    next[i] = { ...next[i], [field]: val };
    setSalaryBands(next);
  }

  function removeBand(i: number) {
    setSalaryBands(salaryBands.filter((_, idx) => idx !== i));
  }

  function addBand() {
    setSalaryBands([...salaryBands, { label: '', min: '', max: '' }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const validBands: SalaryBand[] = salaryBands
      .filter(b => b.label.trim() && (b.min || b.max))
      .map(b => ({ label: b.label.trim(), min: +b.min || 0, max: +b.max || 0, currency: 'USD' }));

    const hasSalaryData = salaryRaw || salaryMin || salaryMax || validBands.length > 0;
    const salary: Salary | undefined = hasSalaryData
      ? {
          raw: salaryRaw || validBands.map(b => `${b.label}: $${b.min.toLocaleString()}–$${b.max.toLocaleString()}`).join(' | '),
          min: salaryMin ? +salaryMin : (validBands.length > 0 ? Math.min(...validBands.map(b => b.min)) : undefined),
          max: salaryMax ? +salaryMax : (validBands.length > 0 ? Math.max(...validBands.map(b => b.max)) : undefined),
          currency: 'USD',
          bands: validBands.length > 0 ? validBands : undefined,
        }
      : undefined;

    await onSave({ title, company, location, url, status, salary, description, notes });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Basic info */}
      <FormSection title="Job Details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Job Title *">
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Software Engineer" className={input} />
          </Field>
          <Field label="Company *">
            <input required value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" className={input} />
          </Field>
          <Field label="Location">
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote, New York NY, etc." className={input} />
          </Field>
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value as JobStatus)} className={input}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Job Posting URL" className="sm:col-span-2">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className={input} />
          </Field>
        </div>
      </FormSection>

      {/* Salary */}
      <FormSection title="Compensation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="As listed">
            <input value={salaryRaw} onChange={e => setSalaryRaw(e.target.value)} placeholder="$80k – $120k" className={input} />
          </Field>
          <Field label="Min (USD)">
            <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="80000" className={input} />
          </Field>
          <Field label="Max (USD)">
            <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="120000" className={input} />
          </Field>
        </div>

        {/* Salary bands */}
        {salaryBands.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Pay Bands</p>
            <div className="space-y-2">
              {salaryBands.map((band, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={band.label}
                    onChange={e => updateBand(i, 'label', e.target.value)}
                    placeholder="Level (e.g. Associate)"
                    className={`${inputSm} flex-1`}
                  />
                  <input
                    type="number"
                    value={band.min}
                    onChange={e => updateBand(i, 'min', e.target.value)}
                    placeholder="Min"
                    className={`${inputSm} w-28`}
                  />
                  <input
                    type="number"
                    value={band.max}
                    onChange={e => updateBand(i, 'max', e.target.value)}
                    placeholder="Max"
                    className={`${inputSm} w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBand(i)}
                    className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={addBand}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          <Plus size={13} /> Add pay band
        </button>
      </FormSection>

      {/* Job Description */}
      <FormSection title="Job Description">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={12}
          placeholder="Paste the full job description here…"
          className={`${input} resize-none`}
        />
        {onParse && description.trim() && (
          <button
            type="button"
            onClick={() => onParse(description)}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            <Sparkles size={12} /> Parse fields from description
          </button>
        )}
      </FormSection>

      {/* Notes */}
      <FormSection title="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Recruiter contact, interview notes, referral info…" className={`${input} resize-none`} />
      </FormSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-colors"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
