import type { ScoringResult, CrossExamResult } from './writing-scorer';

export interface WritingScoreEntry {
  id: string;
  examId: string;
  examTitle: string;
  letterType: 'formal' | 'informal';
  essay: string;
  result: ScoringResult;
  crossExamResults?: CrossExamResult[] | null;
  savedAt: string; // ISO
}
