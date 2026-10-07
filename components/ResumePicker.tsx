'use client';

import { useEffect, useRef, useState } from 'react';
import { listResumes, resumeFileUrl, uploadResume } from '@/lib/storage';
import { MAX_RESUME_BYTES, type ResumeFile } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { ExternalLink, Loader2 } from 'lucide-react';

const UPLOAD = '__upload__';

interface Props {
  value?: string;
  onChange: (id: string | undefined) => void;
  className: string;
}

// Renders inside JobForm's <form>: the upload uses a detached file input, no submit buttons.
export function ResumePicker({ value, onChange, className }: Props) {
  const [resumes, setResumes]     = useState<ResumeFile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listResumes().then(setResumes).catch(() => setError('Failed to load your resumes'));
  }, []);

  function handleSelect(next: string) {
    setError('');
    if (next === UPLOAD) fileInput.current?.click();
    else onChange(next || undefined);
  }

  async function handleFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) { setError('That PDF is over the 4 MB limit'); return; }
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadResume(file);
      setResumes(prev => [uploaded, ...(prev ?? [])]);
      onChange(uploaded.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          value={value ?? ''}
          onChange={e => handleSelect(e.target.value)}
          disabled={resumes === null || uploading}
          className={className}
        >
          <option value="">{resumes === null ? 'Loading…' : 'None'}</option>
          {resumes?.map(r => (
            <option key={r.id} value={r.id}>{r.label} (uploaded {formatDate(r.uploadedAt)})</option>
          ))}
          <option value={UPLOAD}>Upload new PDF…</option>
        </select>
        {uploading && <Loader2 size={16} className="shrink-0 animate-spin text-indigo-500" />}
        {value && !uploading && (
          <a
            href={resumeFileUrl(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <ExternalLink size={12} /> View
          </a>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        onChange={e => handleFile(e.target.files?.[0])}
        className="hidden"
      />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
