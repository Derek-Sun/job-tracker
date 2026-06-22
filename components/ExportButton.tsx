'use client';

import { getAllJobs } from '@/lib/storage';
import { jobsToCsv } from '@/lib/utils';
import { Download } from 'lucide-react';

export function ExportButton() {
  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportJson() {
    const jobs = await getAllJobs();
    download(JSON.stringify(jobs, null, 2), 'job-applications.json', 'application/json');
  }

  async function exportCsv() {
    const jobs = await getAllJobs();
    download(jobsToCsv(jobs), 'job-applications.csv', 'text/csv');
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-sm">
      <span className="pl-2 pr-1">
        <Download size={13} className="text-slate-400" />
      </span>
      <button onClick={exportJson} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
        JSON
      </button>
      <span className="text-slate-200">|</span>
      <button onClick={exportCsv} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
        CSV
      </button>
    </div>
  );
}
