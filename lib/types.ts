export type JobStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

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

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  saved:        'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  applied:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  phone_screen: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  interview:    'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  offer:        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:     'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  withdrawn:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

export const STATUS_DOT: Record<JobStatus, string> = {
  saved:        'bg-slate-400',
  applied:      'bg-blue-500',
  phone_screen: 'bg-amber-500',
  interview:    'bg-violet-500',
  offer:        'bg-emerald-500',
  rejected:     'bg-rose-500',
  withdrawn:    'bg-slate-400',
};
