'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { deleteResume, listResumes, renameResume, resumeFileUrl, uploadResume } from '@/lib/storage';
import { MAX_RESUME_BYTES, type ResumeFile } from '@/lib/types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { ArrowLeft, Check, ExternalLink, FileText, Loader2, Pencil, Trash2, Upload, X } from 'lucide-react';

const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors';
const smallBtn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeFile[] | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    listResumes().then(setResumes).catch(() => setLoadError('Failed to load your resumes'));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      <h1 className="mt-5 text-2xl font-bold text-slate-900">Resumes</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Upload the resumes you send out, then record which one you used on each job.
      </p>

      <UploadCard onUploaded={r => setResumes(prev => [r, ...(prev ?? [])])} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        {loadError ? (
          <p className="p-5 text-sm text-rose-600">{loadError}</p>
        ) : resumes === null ? (
          <div className="m-5 h-12 animate-pulse rounded-lg bg-slate-100" />
        ) : resumes.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No resumes uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resumes.map(r => (
              <ResumeRow
                key={r.id}
                resume={r}
                onRenamed={label => setResumes(prev => prev!.map(x => (x.id === r.id ? { ...x, label } : x)))}
                onDeleted={() => setResumes(prev => prev!.filter(x => x.id !== r.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UploadCard({ onUploaded }: { onUploaded: (r: ResumeFile) => void }) {
  const [file, setFile]           = useState<File | null>(null);
  const [label, setLabel]         = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function choose(f: File | null) {
    setError('');
    setFile(f);
    if (f && f.size > MAX_RESUME_BYTES) setError('That PDF is over the 4 MB limit');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      onUploaded(await uploadResume(file, label));
      setFile(null);
      setLabel('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Upload a resume</p>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        onChange={e => choose(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
      />
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        maxLength={100}
        placeholder={file ? `Name (default: ${file.name.replace(/\.pdf$/i, '')})` : 'Name, e.g. "Backend – Oct 2026"'}
        className={input}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!file || uploading || file.size > MAX_RESUME_BYTES}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <span className="text-xs text-slate-400">PDF, up to 4 MB</span>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}

function ResumeRow({ resume, onRenamed, onDeleted }: {
  resume: ResumeFile;
  onRenamed: (label: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [label, setLabel]           = useState(resume.label);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState('');

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || label.trim() === resume.label) { setEditing(false); setLabel(resume.label); return; }
    setBusy(true);
    setError('');
    try {
      await renameResume(resume.id, label.trim());
      onRenamed(label.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await deleteResume(resume.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const inUse = resume.jobCount > 0;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
          <FileText size={16} />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={handleRename} className="flex items-center gap-1.5">
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)} maxLength={100} className={`${input} py-1`} />
              <button type="submit" disabled={busy} title="Save" className={smallBtn}><Check size={14} /></button>
              <button type="button" onClick={() => { setEditing(false); setLabel(resume.label); }} title="Cancel" className={smallBtn}><X size={14} /></button>
            </form>
          ) : (
            <p className="truncate font-medium text-slate-900">{resume.label}</p>
          )}
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {resume.filename} · {formatFileSize(resume.size)} · Uploaded {formatDate(resume.uploadedAt)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {inUse ? `Used by ${resume.jobCount} job${resume.jobCount === 1 ? '' : 's'}` : 'Not used by any job yet'}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <a href={resumeFileUrl(resume.id)} target="_blank" rel="noopener noreferrer" className={smallBtn}>
            <ExternalLink size={12} /> View
          </a>
          {!editing && (
            <button onClick={() => setEditing(true)} className={smallBtn}><Pencil size={12} /> Rename</button>
          )}
          {confirming ? (
            <>
              <button onClick={handleDelete} disabled={busy} className={`${smallBtn} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Confirm
              </button>
              <button onClick={() => setConfirming(false)} className={smallBtn}>Cancel</button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={inUse}
              title={inUse ? 'Used by a job. Change that job\'s resume before deleting.' : 'Delete'}
              className={`${smallBtn} hover:bg-rose-50 hover:text-rose-600`}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}
