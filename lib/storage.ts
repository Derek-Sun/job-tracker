import type { JobApplication } from './types';

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
