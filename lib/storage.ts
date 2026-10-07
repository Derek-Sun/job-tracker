import type { JobApplication, ResumeFile } from './types';

export async function getAllJobs(): Promise<JobApplication[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function getJob(id: string): Promise<JobApplication | undefined> {
  const res = await fetch(`/api/jobs/${id}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to load job');
  return res.json();
}

export async function saveJob(job: JobApplication): Promise<void> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
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
