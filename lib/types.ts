export type JobStatus =
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface SalaryBand {
  label: string;
  min: number;
  max: number;
  currency?: string;
}

export interface Salary {
  raw: string;
  min?: number;
  max?: number;
  currency?: string;
  bands?: SalaryBand[];
}

export interface JobApplication {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: Salary;
  description: string;
  status: JobStatus;
  url?: string;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  salary?: Salary;
  description: string;
}

export const STATUS_ORDER: JobStatus[] = [
  'applied', 'interview', 'offer', 'rejected',
];

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  applied:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  interview: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  offer:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:  'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};

export const STATUS_DOT: Record<JobStatus, string> = {
  applied:   'bg-blue-500',
  interview: 'bg-violet-500',
  offer:     'bg-emerald-500',
  rejected:  'bg-rose-500',
};
