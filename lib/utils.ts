import type { JobApplication, Salary } from './types';

export function newId(): string {
  return crypto.randomUUID();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSalary(salary?: Salary): string {
  if (!salary) return '—';
  if (salary.bands && salary.bands.length > 0) {
    const mins = salary.bands.map(b => b.min);
    const maxs = salary.bands.map(b => b.max);
    const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
    return `${fmt(Math.min(...mins))} – ${fmt(Math.max(...maxs))}`;
  }
  if (salary.min && salary.max) {
    const fmt = (n: number) =>
      n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
    return `${fmt(salary.min)} – ${fmt(salary.max)}`;
  }
  return salary.raw || '—';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** resumeLabels maps resume IDs to their names for the Resume column */
export function jobsToCsv(jobs: JobApplication[], resumeLabels: Map<string, string> = new Map()): string {
  const headers = [
    'Title',
    'Company',
    'Location',
    'Status',
    'Salary',
    'Applied At',
    'URL',
    'Description',
    'Notes',
    'Resume',
  ];
  const rows = jobs.map((j) => [
    j.title,
    j.company,
    j.location ?? '',
    j.status,
    j.salary?.raw ?? '',
    j.appliedAt,
    j.url ?? '',
    j.description,
    j.notes ?? '',
    j.resumeId ? resumeLabels.get(j.resumeId) ?? '' : '',
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
