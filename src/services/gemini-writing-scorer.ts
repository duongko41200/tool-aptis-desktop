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

  console.log('Gemini error:', msg);
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
  const cleaned = text
    .replace(/```(json|javascript|typescript|js|text)?\s*\n?/gi, '')
    .replace(/```\s*$/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e: any) {
    const msg: string = e?.message ?? '';
    if (msg.includes('Unterminated') || msg.includes('position') || msg.includes('Unexpected end')) {
      throw new Error('Phản hồi Gemini bị cắt ngắn. Vui lòng thử lại.');
    }
    throw new Error(`JSON không hợp lệ: ${msg}`);
  }
}

// Compact JSON — no indentation, saves tokens
const compact = (v: unknown) => JSON.stringify(v);

function buildScoringPrompt(req: ScoringRequest): string {
  const isForml = req.letterType === 'formal';
  const wordTarget = req.wordCountTarget <= 60
    ? `~${req.wordCountTarget} words`
    : `${req.wordCountTarget} words`;

  // Use summary when available — much shorter than full HTML-stripped content
  const context = req.examSummary?.trim() || req.examContent.slice(0, 300);

  return `APTIS Writing Part 4 evaluator. Return JSON only.

SCENARIO: ${context}
TASK: ${req.subQuestionContent}
TYPE: ${isForml ? 'FORMAL' : 'INFORMAL'} | TARGET: ${wordTarget}

ESSAY:
${req.essay}

JSON schema to fill:
{"formatCheck":{"passed":bool,"score":0-5,"letterType":"${req.letterType}","components":{"greeting":{"found":bool,"text":"","note":""},"openingLine":{"found":bool,"text":"","note":""},"body":{"found":bool,"paragraphCount":0,"note":""},"suggestions":{"found":bool,"count":0,"note":""},"closing":{"found":bool,"text":"","note":""},"signature":{"found":bool,"text":"","note":""}},"wordCount":0,"feedback":""},"contentAnalysis":{"solutions":[{"id":"s1","idea":"","originalText":"","relevantToPrompt":bool,"relevanceNote":""}],"promptCoverage":0,"score":0-10,"feedback":""},"grammarCheck":{"errors":[{"id":"g1","originalText":"exact quote from essay","correction":"corrected version","type":"grammar|spelling|vocabulary|punctuation","note":""}],"score":0-5,"feedback":""},"b2Criteria":{"vocabulary":{"score":0-3,"note":""},"cohesion":{"score":0-3,"note":""},"register":{"score":0-2,"note":""},"sentenceVariety":{"score":0-2,"note":""},"score":0-10,"cefrLevel":"A2|B1|B2|C1","cefrNote":"(Vietnamese, 1 sentence explaining why this level)","feedback":""}}

Rules:
- All "note", "cefrNote", and "feedback" must be in Vietnamese
- INFORMAL: suggestions.found=true, suggestions.count=0 (not required for score)
- FORMAL: suggestions required, count>=1 affects score positively
- passed=false if greeting OR closing missing
- solutions: only real proposals/ideas, skip filler sentences
- grammarCheck.errors: list ALL grammar/spelling/vocabulary mistakes; originalText must be exact substring from essay
- b2Criteria: vocabulary=range/variety 0-3, cohesion=connectors/discourse 0-3, register=tone appropriateness 0-2, sentenceVariety=structural mix 0-2
- cefrLevel: holistic assessment of the essay's English proficiency level:
  A2=very basic sentences, very limited vocab, many errors
  B1=can express ideas on familiar topics, basic connectors, some errors
  B2=clear detailed writing, good range of vocab/structures, occasional errors
  C1=sophisticated flexible writing, wide vocab, complex structures, rare errors
- cefrNote: 1 sentence in Vietnamese explaining why you assigned that level`;
}

function buildCrossExamPrompt(solutions: Solution[], allExams: ExamSummary[]): string {
  // Trim context to 80 chars, compact JSON — much lighter prompt
  const solData = compact(solutions.map(s => ({ id: s.id, idea: s.idea })));
  const examData = compact(
    allExams.slice(0, MAX_CROSS_EXAM_EXAMS).map(e => ({
      id: e.examId,
      t: e.examTitle,
      c: (e.summary || e.context).slice(0, 120),
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
