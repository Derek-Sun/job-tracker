import type { JobStatus } from '@/lib/types';
import { STATUS_COLORS, STATUS_DOT, STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
