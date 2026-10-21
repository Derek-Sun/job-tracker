import type { JobApplication, ParsedJob, ResumeFile, ActivityLogEntry } from './types';

export async function getAllJobs(): Promise<JobApplication[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

/** `note`, if given, is recorded as the job's first activity log entry. */
export async function saveJob(job: JobApplication, note?: string): Promise<void> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...job, note }),
  });
  if (!res.ok) throw new Error('Failed to save job');
}

export async function updateJob(job: JobApplication): Promise<void> {
  const res = await fetch(`/api/jobs/${job.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error('Failed to update job');
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete job');
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  return res.json();
}

export function fetchJobFromUrl(url: string): Promise<ParsedJob> {
  return postJson('/api/fetch-job', { url }, 'Failed to fetch page');
}

export function parseJobText(text: string): Promise<ParsedJob> {
  return postJson('/api/parse-job', { text }, 'Failed to parse description');
}

export async function listResumes(): Promise<ResumeFile[]> {
  const res = await fetch('/api/resumes');
  if (!res.ok) throw new Error('Failed to load resumes');
  return res.json();
}

export async function uploadResume(file: File, label?: string): Promise<ResumeFile> {
  const form = new FormData();
  form.append('file', file);
  if (label?.trim()) form.append('label', label.trim());
  const res = await fetch('/api/resumes', { method: 'POST', body: form });
  if (!res.ok) throw new Error(await errorMessage(res, 'Upload failed'));
  return res.json();
}

export async function renameResume(id: string, label: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to rename resume'));
}

export async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to delete resume'));
}

export function resumeFileUrl(id: string): string {
  return `/api/resumes/${id}/file`;
}

export async function addLogEntry(jobId: string, entry: ActivityLogEntry): Promise<ActivityLogEntry> {
  const res = await fetch(`/api/jobs/${jobId}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to add log entry');
  return res.json();
}

export async function editLogEntry(jobId: string, entryId: string, content: string): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/log`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId, content }),
  });
  if (!res.ok) throw new Error('Failed to edit log entry');
}

export async function deleteLogEntry(jobId: string, entryId: string): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/log?entryId=${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete log entry');
}
