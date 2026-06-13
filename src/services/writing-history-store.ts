import { invoke } from '@tauri-apps/api/core';
import type { WritingScoreEntry } from '../types/writing-history';
import type { ScoringResult, CrossExamResult } from '../types/writing-scorer';

export async function saveEntry(
  params: Omit<WritingScoreEntry, 'id' | 'savedAt'>,
): Promise<WritingScoreEntry> {
  const entry: WritingScoreEntry = {
    ...params,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };

  const wordCount = entry.essay.trim() ? entry.essay.trim().split(/\s+/).length : 0;
  const crossExamResultsJson = entry.crossExamResults
    ? JSON.stringify(entry.crossExamResults)
    : null;

  if (!('__TAURI_INTERNALS__' in window)) {
    throw new Error('Tính năng lưu lịch sử chỉ hoạt động trên ứng dụng Desktop. Vui lòng chạy ứng dụng qua lệnh "npm run app".');
  }

  await invoke('save_writing_score', {
    id: entry.id,
    examId: entry.examId,
    examTitle: entry.examTitle,
    letterType: entry.letterType,
    essay: entry.essay,
    resultJson: JSON.stringify(entry.result),
    crossExamResultsJson,
    wordCount,
    savedAt: entry.savedAt,
  });

  return entry;
}

export async function getByExam(examId: string): Promise<WritingScoreEntry[]> {
  if (!('__TAURI_INTERNALS__' in window)) {
    return []; // Return empty history in web browser
  }

  const rows = await invoke<Array<{
    id: string; exam_id: string; exam_title: string; letter_type: string;
    essay: string; result_json: string; cross_exam_results_json: string | null; saved_at: string;
  }>>('get_writing_scores_by_exam', { examId });

  return rows.map(r => ({
    id: r.id,
    examId: r.exam_id,
    examTitle: r.exam_title,
    letterType: r.letter_type as 'formal' | 'informal',
    essay: r.essay,
    result: JSON.parse(r.result_json) as ScoringResult,
    crossExamResults: r.cross_exam_results_json
      ? (JSON.parse(r.cross_exam_results_json) as CrossExamResult[])
      : null,
    savedAt: r.saved_at,
  }));
}

export async function deleteEntry(id: string): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) {
    throw new Error('Tính năng này chỉ hoạt động trên ứng dụng Desktop. Vui lòng chạy ứng dụng qua lệnh "npm run app".');
  }
  await invoke('delete_writing_score', { id });
}
