export type JobStatus =
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted';

export type InterviewStage =
  | 'phone_screen'
  | 'technical'
  | 'onsite'
  | 'final';

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
  interviewStage?: InterviewStage;
  url?: string;
  /** @deprecated migrated to ActivityLog; kept for backward-compat during transition */
  notes?: string;
  /** Uploaded resume recorded as the one sent for this job */
  resumeId?: string;
  appliedAt: string;
  updatedAt: string;
  /** Most recent activity_log entry createdAt; populated by dbGetAllJobs JOIN */
  lastActivityAt?: string;
}

export type LogEntryType = 'status_change' | 'note';

export interface ActivityLogEntry {
  id: string;
  jobId: string;
  type: LogEntryType;
  content: string;
  fromStatus?: JobStatus;
  toStatus?: JobStatus;
  fromStage?: InterviewStage;
  toStage?: InterviewStage;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeFile {
  id: string;
  label: string;
  filename: string;
  size: number;
  uploadedAt: string;
  /** Number of jobs recording this resume as the one sent */
  jobCount: number;
}

// Vercel rejects request bodies over 4.5 MB; leave room for the multipart envelope
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
export const RESUME_TOO_LARGE = 'That PDF is over the 4 MB limit';

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  salary?: Salary;
  description: string;
}

export const STATUS_ORDER: JobStatus[] = [
  'applied', 'interview', 'offer', 'rejected', 'withdrawn', 'ghosted',
];

export const TERMINAL_STATUSES = new Set<JobStatus>(['rejected', 'withdrawn', 'ghosted']);

export const INTERVIEW_STAGE_ORDER: InterviewStage[] = [
  'phone_screen', 'technical', 'onsite', 'final',
];

export const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
  phone_screen: 'Phone Screen',
  technical: 'Technical',
  onsite: 'Onsite',
  final: 'Final',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  applied:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  interview: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  offer:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:  'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  withdrawn: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  ghosted:   'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

export const STATUS_DOT: Record<JobStatus, string> = {
  applied:   'bg-blue-500',
  interview: 'bg-violet-500',
  offer:     'bg-emerald-500',
  rejected:  'bg-rose-500',
  withdrawn: 'bg-amber-500',
  ghosted:   'bg-slate-400',
};
