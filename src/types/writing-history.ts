import type { ScoringResult } from './writing-scorer';

export interface WritingScoreEntry {
  id: string;
  examId: string;
  examTitle: string;
  letterType: 'formal' | 'informal';
  essay: string;
  result: ScoringResult;
  savedAt: string; // ISO
}
