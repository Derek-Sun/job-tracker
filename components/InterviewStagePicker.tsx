'use client';

import { useState } from 'react';
import type { InterviewStage } from '@/lib/types';
import { INTERVIEW_STAGE_ORDER, INTERVIEW_STAGE_LABELS } from '@/lib/types';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
  stage: InterviewStage | undefined;
  onChange: (stage: InterviewStage) => void;
}

export function InterviewStagePicker({ stage, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <span className={stage ? 'text-violet-700' : 'text-slate-400 italic'}>
          {stage ? INTERVIEW_STAGE_LABELS[stage] : 'Set stage'}
        </span>
        <ChevronDown size={10} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {INTERVIEW_STAGE_ORDER.map(s => (
              <button
                key={s}
                onClick={e => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className={s === stage ? 'font-medium text-slate-900 flex-1 text-left' : 'flex-1 text-left'}>
                  {INTERVIEW_STAGE_LABELS[s]}
                </span>
                {s === stage && <Check size={12} className="text-indigo-500 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
