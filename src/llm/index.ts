import { config } from '#root/config.js';
import OpenAI from 'openai';

/** A single translation entry */
export interface TranslationEntry {
  word: string;
  translation: string;
  pos?: string;
  transcription: string;
  def: string;
  examples: { original: string; translation: string }[];
}

/** Wrapper returned by the model in JSON-mode */
interface TranslationResponse {
  translations: TranslationEntry[];
}

export const openAIClient = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmApiUrl, // can be api.openai.com or an OpenRouter proxy
});

/** Main call */
export async function translateWithLLM(
  word: string,
  direction: string,
): Promise<TranslationEntry[] | null> {
  const prompt = buildTranslationPrompt(word, direction);

  const res = await openAIClient.chat.completions.create({
    model: config.llmModel ?? 'gpt-4o-mini',
    response_format: { type: 'json_object' }, // ← key change
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = res.choices?.[0]?.message?.content ?? '';
  try {
    const data = JSON.parse(raw) as TranslationResponse;
    return data.translations ?? null;
  }
  catch {
    // Should rarely happen in JSON-mode; fall back or log.
    console.error('Failed to parse JSON-mode response:', raw);
    return null;
  }
}

/** Шаблон промпта с плейсхолдерами */
const PROMPT_TEMPLATE = `
You are a professional language-translation assistant.

Return a JSON object with a single key "translations".
Its value MUST be an array (max 5) ordered by most-common meaning first.
Each array element has the shape:
{
  "word": "{{WORD}}",          // original word
  "translation": "...",        // target-language equivalent
  "pos": "...",                // part of speech (omit if mixed)
  "transcription": "...",      // pronunciation
  "def": "...",                // concise definition
  "examples": [                // ≥ 2 examples
    { "original": "...", "translation": "..." }
  ]
}

No other keys, no comments, no markdown fences.`;

/** Строим текст промпта */
function buildTranslationPrompt(word: string, direction: string): string {
  return PROMPT_TEMPLATE
    .replace('{{WORD}}', word)
    .replace('{{DIRECTION}}', direction);
}
