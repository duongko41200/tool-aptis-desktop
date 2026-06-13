import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WritingScoreEntry } from '../types/writing-history';

interface WritingHistoryState {
  byExam: Record<string, WritingScoreEntry[]>;
  loadedExams: string[];
}

const initialState: WritingHistoryState = {
  byExam: {},
  loadedExams: [],
};

const writingHistorySlice = createSlice({
  name: 'writingHistory',
  initialState,
  reducers: {
    setExamHistory(state, action: PayloadAction<{ examId: string; entries: WritingScoreEntry[] }>) {
      state.byExam[action.payload.examId] = action.payload.entries;
      if (!state.loadedExams.includes(action.payload.examId)) {
        state.loadedExams.push(action.payload.examId);
      }
    },
    addWritingEntry(state, action: PayloadAction<{ examId: string; entry: WritingScoreEntry }>) {
      const { examId, entry } = action.payload;
      if (!state.byExam[examId]) state.byExam[examId] = [];
      state.byExam[examId] = [entry, ...state.byExam[examId]];
    },
    removeWritingEntry(state, action: PayloadAction<{ examId: string; entryId: string }>) {
      const { examId, entryId } = action.payload;
      if (state.byExam[examId]) {
        state.byExam[examId] = state.byExam[examId].filter(e => e.id !== entryId);
      }
    },
  },
});

export const { setExamHistory, addWritingEntry, removeWritingEntry } = writingHistorySlice.actions;
export default writingHistorySlice.reducer;
