import { useState, useCallback, useRef } from 'react';
import { getSettings } from '../services/tauriCommands';
import { scoreEssay, analyzeCrossExam } from '../services/gemini-writing-scorer';
import { htmlToText } from '../utils/html-to-text';
import type {
  ScoringRequest,
  ScoringResult,
  CrossExamResult,
  ScoringStatus,
  ExamSummary,
  LetterType,
} from '../types/writing-scorer';

const LS_KEY = 'gemini_api_key';

async function resolveApiKey(): Promise<string> {
  try {
    const s = await getSettings();
    const key = s.gemini_api_key ?? '';
    if (key) return key;
  } catch {
    // Tauri not available — fall through to localStorage
  }
  return localStorage.getItem(LS_KEY) ?? '';
}

export function hasStoredApiKey(): boolean {
  return !!localStorage.getItem(LS_KEY);
}

interface ScoreParams {
  essay: string;
  examId: string;
  examTitle: string;
  examContentHtml: string;
  subQuestionContent: string;
  letterType: LetterType;
  wordCountTarget: number;
}

interface UseWritingScorerReturn {
  status: ScoringStatus;
  result: ScoringResult | null;
  crossExamResults: CrossExamResult[] | null;
  error: string | null;
  isStale: boolean;
  score: (params: ScoreParams) => Promise<void>;
  runCrossExamAnalysis: (allExams: ExamSummary[], currentExamId: string) => Promise<void>;
  reset: () => void;
  markStale: (currentEssay: string) => void;
}

export function useWritingScorer(): UseWritingScorerReturn {
  const [status, setStatus] = useState<ScoringStatus>('idle');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [crossExamResults, setCrossExamResults] = useState<CrossExamResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const lastScoredEssayRef = useRef<string>('');

  const score = useCallback(async (params: ScoreParams) => {
    setStatus('scoring');
    setResult(null);
    setCrossExamResults(null);
    setError(null);
    setIsStale(false);

    try {
      const apiKey = await resolveApiKey();

      const req: ScoringRequest = {
        essay: params.essay,
        examId: params.examId,
        examTitle: params.examTitle,
        examContent: htmlToText(params.examContentHtml),
        subQuestionContent: params.subQuestionContent,
        letterType: params.letterType,
        wordCountTarget: params.wordCountTarget,
      };

      const scoring = await scoreEssay(req, apiKey);
      lastScoredEssayRef.current = params.essay;
      setResult(scoring);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const runCrossExamAnalysis = useCallback(async (
    allExams: ExamSummary[],
    currentExamId: string,
  ) => {
    if (!result?.contentAnalysis.solutions.length) return;

    setStatus('analyzing_cross');
    setCrossExamResults(null);
    setError(null);

    try {
      const apiKey = await resolveApiKey();

      const crossResults = await analyzeCrossExam(
        result.contentAnalysis.solutions,
        allExams,
        currentExamId,
        apiKey,
      );
      setCrossExamResults(crossResults);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [result]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setCrossExamResults(null);
    setError(null);
    setIsStale(false);
    lastScoredEssayRef.current = '';
  }, []);

  const markStale = useCallback((currentEssay: string) => {
    if (result && lastScoredEssayRef.current && currentEssay !== lastScoredEssayRef.current) {
      setIsStale(true);
    }
  }, [result]);

  return { status, result, crossExamResults, error, isStale, score, runCrossExamAnalysis, reset, markStale };
}
