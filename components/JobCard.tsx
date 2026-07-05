import Link from 'next/link';
import type { JobApplication } from '@/lib/types';
import { formatDate, formatSalary } from '@/lib/utils';
import { Trash2, ExternalLink } from 'lucide-react';

interface Props {
  job: JobApplication;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

export function JobCard({ job, onDelete, isDragging, onDragStart, onDragEnd }: Props) {
  const salary = formatSalary(job.salary);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, job.id)}
      onDragEnd={onDragEnd}
      className={`group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="font-medium text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2"
        >
          {job.title}
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open posting"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete "${job.title}"?`)) onDelete(job.id);
            }}
            title="Delete"
            className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <p className="mt-0.5 text-sm text-slate-600 line-clamp-1">
        {job.company || <span className="italic text-slate-400">Unknown</span>}
      </p>
      {job.location && (
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{job.location}</p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 tabular-nums">
        {salary !== '—' ? <span>{salary}</span> : <span />}
        <span>{formatDate(job.appliedAt)}</span>
      </div>
    </div>
  );
}
