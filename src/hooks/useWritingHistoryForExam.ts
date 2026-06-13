import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setExamHistory, addWritingEntry, removeWritingEntry } from '../store/writingHistorySlice';
import { getByExam, saveEntry, deleteEntry } from '../services/writing-history-store';
import type { WritingScoreEntry } from '../types/writing-history';

export function useWritingHistoryForExam(examId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const entries = useSelector((s: RootState) => s.writingHistory.byExam[examId] ?? []);
  const isLoaded = useSelector((s: RootState) => s.writingHistory.loadedExams.includes(examId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded || !examId) return;
    setLoading(true);
    getByExam(examId)
      .then(data => dispatch(setExamHistory({ examId, entries: data })))
      .catch(err => console.error('[writing-history] load failed:', err))
      .finally(() => setLoading(false));
  }, [examId, isLoaded, dispatch]);

  // Throws on failure — caller is responsible for showing the error
  const save = async (params: Omit<WritingScoreEntry, 'id' | 'savedAt'>) => {
    const entry = await saveEntry(params);
    dispatch(addWritingEntry({ examId, entry }));
    return entry;
  };

  // Throws on failure — caller is responsible for showing the error
  const remove = async (entryId: string) => {
    await deleteEntry(entryId);
    dispatch(removeWritingEntry({ examId, entryId }));
  };

  return { entries, loading, save, remove };
}
