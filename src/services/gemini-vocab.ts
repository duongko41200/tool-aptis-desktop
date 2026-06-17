import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

export async function generateMeaning(frontText: string, apiKey: string): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Chưa có Gemini API key. Vui lòng thêm key ở màn hình Welcome.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  const prompt = `Translate or explain the following English text into Vietnamese. 
If it's a single word/phrase, give its concise meaning and a short example. 
If it's a sentence or paragraph, provide a natural Vietnamese translation.
Do NOT use markdown, formatting, or wrapping quotes. Just return the direct answer.

Text to translate/explain:
"${frontText}"`;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('API_KEY_INVALID')) throw new Error('API Key không hợp lệ.');
    throw new Error(`Lỗi Gemini: ${msg}`);
  }
}
