import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ScoringRequest,
  ScoringResult,
  Solution,
  ExamSummary,
  CrossExamResult,
} from '../types/writing-scorer';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const RETRY_DELAY_MS = 4000;
// Max exams sent in cross-exam prompt — keeps token count predictable
const MAX_CROSS_EXAM_EXAMS = 12;

function makeModel(genAI: GoogleGenerativeAI, modelName: string) {
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });
}

async function generateWithFallback(genAI: GoogleGenerativeAI, prompt: string): Promise<string> {
  let lastErr: unknown;
  for (const modelName of MODELS) {
    try {
      const model = makeModel(genAI, modelName);
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? 0;
      if (status === 429 || status >= 500) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function handleGeminiError(err: unknown): string {
  const msg = (err as any)?.message ?? String(err);
  if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
    return 'Gemini rate limit. Vui lòng thử lại sau 1 phút.';
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) {
    return 'Gemini API key không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (msg.includes('503') || msg.toLowerCase().includes('high demand')) {
    return 'Gemini đang quá tải. Vui lòng thử lại sau ít phút.';
  }
  return `Gemini lỗi: ${msg}`;
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e: any) {
    if (e?.message?.includes('Unterminated') || e?.message?.includes('position')) {
      throw new Error('Phản hồi Gemini bị cắt ngắn. Vui lòng thử lại.');
    }
    throw new Error(`JSON không hợp lệ: ${e?.message}`);
  }
}

// Compact JSON — no indentation, saves tokens
const compact = (v: unknown) => JSON.stringify(v);

function buildScoringPrompt(req: ScoringRequest): string {
  const isForml = req.letterType === 'formal';
  const wordTarget = req.wordCountTarget <= 60
    ? `~${req.wordCountTarget} words`
    : `${req.wordCountTarget} words`;

  // Keep schema terse — no inline comments, no verbose field descriptions
  return `APTIS Writing Part 4 evaluator. Return JSON only.

SCENARIO: ${req.examContent}
TASK: ${req.subQuestionContent}
TYPE: ${isForml ? 'FORMAL' : 'INFORMAL'} | TARGET: ${wordTarget}

ESSAY:
${req.essay}

JSON schema to fill:
{"formatCheck":{"passed":bool,"score":0-5,"letterType":"${req.letterType}","components":{"greeting":{"found":bool,"text":"","note":""},"openingLine":{"found":bool,"text":"","note":""},"body":{"found":bool,"paragraphCount":0,"note":""},"suggestions":{"found":bool,"count":0,"note":""},"closing":{"found":bool,"text":"","note":""},"signature":{"found":bool,"text":"","note":""}},"wordCount":0,"feedback":""},"contentAnalysis":{"solutions":[{"id":"s1","idea":"","originalText":"","relevantToPrompt":bool,"relevanceNote":""}],"promptCoverage":0,"score":0-10,"feedback":""}}

Rules:
- All "note" and "feedback" values must be in Vietnamese
- INFORMAL: suggestions.found=true, suggestions.count=0 (not required)
- FORMAL: suggestions required, affects score
- passed=false if greeting OR closing missing
- solutions: only real ideas, skip filler sentences`;
}

function buildCrossExamPrompt(solutions: Solution[], allExams: ExamSummary[]): string {
  // Trim context to 80 chars, compact JSON — much lighter prompt
  const solData = compact(solutions.map(s => ({ id: s.id, idea: s.idea })));
  const examData = compact(
    allExams.slice(0, MAX_CROSS_EXAM_EXAMS).map(e => ({
      id: e.examId,
      t: e.examTitle,
      c: e.context.slice(0, 80),
    }))
  );

  return `APTIS writing coach. Return JSON only.

SOLUTIONS: ${solData}
OTHER EXAMS: ${examData}

For each solution, find which other exams it applies to.
JSON schema: [{"solutionId":"","solutionIdea":"(Vietnamese)","applicableExams":[{"examId":"","examTitle":"","applicability":"direct|with_modification","modificationNote":"(Vietnamese, max 12 words)"}]}]

Rules:
- Skip exams where idea does not apply at all
- "direct": use as-is | "with_modification": same idea, minor topic adjustment
- modificationNote in Vietnamese, under 12 words`;
}

export async function scoreEssay(req: ScoringRequest, apiKey: string): Promise<ScoringResult> {
  if (!apiKey.trim()) {
    throw new Error('Chưa có Gemini API key. Vui lòng nhập key bên dưới.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const text = await generateWithFallback(genAI, buildScoringPrompt(req));
    return parseJson<ScoringResult>(text);
  } catch (err) {
    throw new Error(handleGeminiError(err));
  }
}

export async function analyzeCrossExam(
  solutions: Solution[],
  allExams: ExamSummary[],
  currentExamId: string,
  apiKey: string,
): Promise<CrossExamResult[]> {
  if (!apiKey.trim()) {
    throw new Error('Chưa có Gemini API key. Vui lòng nhập key bên dưới.');
  }

  const otherExams = allExams.filter((e) => e.examId !== currentExamId);
  const relevantSolutions = solutions.filter((s) => s.relevantToPrompt);
  if (relevantSolutions.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const text = await generateWithFallback(genAI, buildCrossExamPrompt(relevantSolutions, otherExams));
    const parsed = parseJson<CrossExamResult[]>(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed as any).results ?? [];
    return arr.map((item: any) => ({
      solutionId: item.solutionId ?? '',
      solutionIdea: item.solutionIdea ?? '',
      applicableExams: (item.applicableExams ?? []).filter(
        (e: any) => e.applicability === 'direct' || e.applicability === 'with_modification',
      ),
    }));
  } catch (err) {
    throw new Error(handleGeminiError(err));
  }
}
