import { invoke } from '@tauri-apps/api/core';
import type { WritingScoreEntry } from '../types/writing-history';
import type { ScoringResult } from '../types/writing-scorer';

// ── localStorage fallback (dev / Tauri unavailable) ───────────────────
const LS_KEY = 'writing_score_history';
const MAX_LS_ENTRIES = 100;

function lsReadAll(): WritingScoreEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function lsWriteAll(entries: WritingScoreEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

// ── Tauri helpers ──────────────────────────────────────────────────────
function isTauri(): boolean {
  return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
}

// ── Public API ─────────────────────────────────────────────────────────

export async function saveEntry(
  params: Omit<WritingScoreEntry, 'id' | 'savedAt'> & { result: ScoringResult },
): Promise<WritingScoreEntry> {
  const entry: WritingScoreEntry = {
    ...params,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };

  if (isTauri()) {
    try {
      const wordCount = entry.essay.trim() ? entry.essay.trim().split(/\s+/).length : 0;
      await invoke('save_writing_score', {
        id: entry.id,
        examId: entry.examId,
        examTitle: entry.examTitle,
        letterType: entry.letterType,
        essay: entry.essay,
        resultJson: JSON.stringify(entry.result),
        wordCount,
        savedAt: entry.savedAt,
      });
      return entry;
    } catch (e) {
      console.warn('Tauri save_writing_score failed, falling back to localStorage:', e);
    }
  }

  // localStorage fallback
  const existing = lsReadAll();
  lsWriteAll([entry, ...existing].slice(0, MAX_LS_ENTRIES));
  return entry;
}

export async function getByExam(examId: string): Promise<WritingScoreEntry[]> {
  if (isTauri()) {
    try {
      const rows = await invoke<Array<{
        id: string; exam_id: string; exam_title: string; letter_type: string;
        essay: string; result_json: string; saved_at: string;
      }>>('get_writing_scores_by_exam', { examId });
      return rows.map(r => ({
        id: r.id,
        examId: r.exam_id,
        examTitle: r.exam_title,
        letterType: r.letter_type as 'formal' | 'informal',
        essay: r.essay,
        result: JSON.parse(r.result_json) as ScoringResult,
        savedAt: r.saved_at,
      }));
    } catch (e) {
      console.warn('Tauri get_writing_scores_by_exam failed, falling back to localStorage:', e);
    }
  }
  return lsReadAll().filter(e => e.examId === examId);
}

export async function deleteEntry(id: string): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('delete_writing_score', { id });
      return;
    } catch (e) {
      console.warn('Tauri delete_writing_score failed, falling back to localStorage:', e);
    }
  }
  lsWriteAll(lsReadAll().filter(e => e.id !== id));
}
