import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SpeakingScoringRequest {
  part: number;
  question: string;
  audioBlob: Blob;
  suggestion?: string; // model answer from exam
}

export interface SpeakingScoringResult {
  transcript: string;
  feedback: string;
  fluencyScore: number;
  vocabScore: number;
  grammarScore: number;
  pronunciationScore: number;
  corrections: {
    originalText: string;
    correction: string;
    type: 'grammar' | 'vocabulary' | 'pronunciation';
    note: string;
  }[];
  modelAnswer: string;
}

const MODELS = ['gemini-2.5-flash'];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 5000;

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

function isRetryable(err: any): boolean {
  const status = err?.status ?? 0;
  const msg: string = err?.message ?? '';
  return status === 429 || status === 503 || status >= 500 || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable');
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

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function scoreSpeaking(req: SpeakingScoringRequest, apiKey: string): Promise<SpeakingScoringResult> {
  if (!apiKey.trim()) {
    throw new Error('Chưa có Gemini API key. Vui lòng nhập key.');
  }

  const base64Audio = await blobToBase64(req.audioBlob);
  const mimeType = req.audioBlob.type || 'audio/webm';

  const promptText = `
You are an expert Aptis Speaking examiner. Listen to the provided audio recording of a candidate answering a speaking test question.

PART: ${req.part}
QUESTION: ${req.question}
SUGGESTED ANSWER / HINT: ${req.suggestion || 'None'}

Please provide a detailed evaluation in strictly valid JSON format matching this schema:
{
  "transcript": "Write the exact transcription of what the candidate said in the audio. If you can't hear clearly, use [unintelligible].",
  "feedback": "Overall constructive feedback in Vietnamese summarizing strengths and weaknesses.",
  "fluencyScore": 0,
  "vocabScore": 0,
  "grammarScore": 0,
  "pronunciationScore": 0,
  "corrections": [
    {
      "originalText": "Exact quote of the mistake from the transcript",
      "correction": "Corrected version",
      "type": "grammar",
      "note": "Brief explanation in Vietnamese of why it's wrong and how to improve"
    }
  ],
  "modelAnswer": "A high-scoring (B2/C1) model answer for this exact question to inspire the student."
}

Rules:
- ALL "feedback" and "note" fields MUST be in Vietnamese.
- Provide practical corrections.
- Score fairly based on the Aptis speaking criteria (out of 5).
- If the audio is empty or just noise, set transcript to "Không có âm thanh rõ ràng" and scores to 0.
  `;

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastErr: unknown;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const model = makeModel(genAI, modelName);
        const result = await model.generateContent([
          promptText,
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
        ]);
        const responseText = result.response.text();
        return parseJson<SpeakingScoringResult>(responseText);
      } catch (err: any) {
        lastErr = err;
        if (!isRetryable(err)) throw err;
        const jitter = (Math.random() * 2 - 1) * 1000;
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(handleGeminiError(lastErr));
}
