export type LetterType = 'formal' | 'informal';

export interface ScoringRequest {
  essay: string;
  examId: string;
  examTitle: string;
  examContent: string;
  examSummary?: string;
  subQuestionContent: string;
  letterType: LetterType;
  wordCountTarget: number;
}

export interface ComponentCheck {
  found: boolean;
  text?: string;
  note?: string;
}

export interface FormatCheckResult {
  passed: boolean;
  score: number;
  letterType: LetterType;
  components: {
    greeting: ComponentCheck;
    openingLine: ComponentCheck;
    body: ComponentCheck & { paragraphCount?: number };
    suggestions: ComponentCheck & { count?: number };
    closing: ComponentCheck;
    signature: ComponentCheck;
  };
  wordCount: number;
  feedback: string;
}

export interface Solution {
  id: string;
  idea: string;
  originalText: string;
  relevantToPrompt: boolean;
  relevanceNote: string;
}

export interface ContentAnalysisResult {
  solutions: Solution[];
  promptCoverage: number;
  score: number;
  feedback: string;
}

export interface GrammarError {
  id: string;
  originalText: string;
  correction: string;
  type: 'grammar' | 'spelling' | 'vocabulary' | 'punctuation';
  note: string;
}

export interface GrammarCheck {
  errors: GrammarError[];
  score: number;   // 0–5
  feedback: string;
}

export interface B2Criterion {
  score: number;
  note: string;
}

export interface B2CriteriaCheck {
  vocabulary: B2Criterion;    // 0–3
  cohesion: B2Criterion;      // 0–3
  register: B2Criterion;      // 0–2
  sentenceVariety: B2Criterion; // 0–2
  score: number;              // 0–10
  feedback: string;
}

export interface ScoringResult {
  formatCheck: FormatCheckResult;
  contentAnalysis: ContentAnalysisResult;
  grammarCheck: GrammarCheck;
  b2Criteria: B2CriteriaCheck;
}

export interface ExamSummary {
  examId: string;
  examTitle: string;
  context: string;
  summary?: string;
}

export type CrossExamApplicability = 'direct' | 'with_modification' | 'not_applicable';

export interface ExamApplicability {
  examId: string;
  examTitle: string;
  applicability: CrossExamApplicability;
  modificationNote: string;
}

export interface CrossExamResult {
  solutionId: string;
  solutionIdea: string;
  applicableExams: ExamApplicability[];
}

export type ScoringStatus = 'idle' | 'scoring' | 'analyzing_cross' | 'done' | 'error';

export interface WritingScorerState {
  status: ScoringStatus;
  result: ScoringResult | null;
  crossExamResults: CrossExamResult[] | null;
  error: string | null;
}
