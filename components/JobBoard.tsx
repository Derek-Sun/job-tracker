'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobApplication, JobStatus } from '@/lib/types';
import { STATUS_ORDER, STATUS_LABELS, STATUS_DOT } from '@/lib/types';
import { JobCard } from './JobCard';

interface Props {
  jobs: JobApplication[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}

const EDGE_ZONE = 60;
const SCROLL_SPEED = 12; // px per animation frame

export function JobBoard({ jobs, onDelete, onStatusChange }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Direction is read/written from a rAF loop, not React state — driving the scroll off
  // dragover events directly is unreliable since Chromium doesn't refire dragover on a
  // steady timer while the pointer is held still near the edge.
  const edgeScrollDir = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!draggedId) return;
    let frame: number;
    const tick = () => {
      const container = scrollRef.current;
      if (container && edgeScrollDir.current) {
        container.scrollLeft += edgeScrollDir.current === 'right' ? SCROLL_SPEED : -SCROLL_SPEED;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [draggedId]);

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStatus(null);
    edgeScrollDir.current = null;
  }

  function updateEdgeScroll(e: React.DragEvent) {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (e.clientX < rect.left + EDGE_ZONE) {
      edgeScrollDir.current = 'left';
    } else if (e.clientX > rect.right - EDGE_ZONE) {
      edgeScrollDir.current = 'right';
    } else {
      edgeScrollDir.current = null;
    }
  }

  function handleDragOver(e: React.DragEvent, status: JobStatus) {
    e.preventDefault();
    updateEdgeScroll(e);
    setDragOverStatus(status);
  }

  function handleDragLeave(status: JobStatus) {
    setDragOverStatus(s => (s === status ? null : s));
  }

  function handleDrop(e: React.DragEvent, status: JobStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOverStatus(null);
    if (!id) return;
    const job = jobs.find(j => j.id === id);
    if (job && job.status !== status) onStatusChange(id, status);
  }

  return (
    <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2">
      {STATUS_ORDER.map(status => {
        const columnJobs = jobs
          .filter(j => j.status === status)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const isOver = dragOverStatus === status;

        return (
          <div key={status} className="w-72 shrink-0">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
              <h3 className="text-sm font-semibold text-slate-700">{STATUS_LABELS[status]}</h3>
              <span className="text-xs text-slate-400">{columnJobs.length}</span>
            </div>

            <div
              onDragOver={e => handleDragOver(e, status)}
              onDragLeave={() => handleDragLeave(status)}
              onDrop={e => handleDrop(e, status)}
              className={`min-h-40 space-y-2 rounded-xl border p-2 transition-colors ${
                isOver
                  ? 'border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-300'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              {columnJobs.length === 0 ? (
                <p className="py-6 text-center text-xs italic text-slate-300">No jobs</p>
              ) : (
                columnJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDelete={onDelete}
                    isDragging={draggedId === job.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
