'use client';

import { useState } from 'react';
import type { ActivityLogEntry } from '@/lib/types';
import { addLogEntry, editLogEntry, deleteLogEntry } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { MessageSquare, ArrowRight, Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  jobId: string;
  initialEntries: ActivityLogEntry[];
}

export function ActivityLog({ jobId, initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    setSaving(true);
    const now = new Date().toISOString();
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      jobId,
      type: 'note',
      content: text,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const saved = await addLogEntry(jobId, entry);
      setEntries(prev => [...prev, saved]);
      setNoteText('');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    await editLogEntry(jobId, id, text);
    setEntries(prev =>
      prev.map(e => e.id === id ? { ...e, content: text, updatedAt: new Date().toISOString() } : e)
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return;
    await deleteLogEntry(jobId, id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function startEdit(entry: ActivityLogEntry) {
    setEditingId(entry.id);
    setEditText(entry.content);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <MessageSquare size={14} />
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity</h2>
      </div>

      {entries.length === 0 ? (
        <p className="mb-4 text-sm italic text-slate-400">No activity yet.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                {entry.type === 'note' ? <MessageSquare size={10} /> : <ArrowRight size={10} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {entry.type === 'status_change' ? (
                      <p className="text-sm text-slate-600">{entry.content}</p>
                    ) : editingId === entry.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={2}
                          autoFocus
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEdit(entry.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Check size={10} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <X size={10} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.content}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  {entry.type === 'note' && editingId !== entry.id && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => startEdit(entry)}
                        className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Edit note"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">⌘↵ to save</p>
          <button
            disabled={!noteText.trim() || saving}
            onClick={handleAddNote}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}
