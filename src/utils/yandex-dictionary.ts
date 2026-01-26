import type { TranslationEntry } from '#root/llm/tasks/translate.js';
import { logger } from '#root/logger.js';

const YANDEX_DICT_API_URL = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup';

// Yandex Dictionary API response types
interface YandexTextItem {
  text: string;
  pos?: string;
  gen?: string;
  num?: string;
}

interface YandexExample {
  text: string;
  tr: YandexTextItem[];
}

interface YandexTranslation extends YandexTextItem {
  syn?: YandexTextItem[];
  mean?: YandexTextItem[];
  ex?: YandexExample[];
}

interface YandexDefinition {
  text: string;
  pos?: string;
  ts?: string; // transcription
  tr: YandexTranslation[];
}

interface YandexDictResponse {
  head: Record<string, unknown>;
  def: YandexDefinition[];
}

export interface YandexDictOptions {
  apiKey: string;
  ui?: string; // interface language: en, ru, uk, tr
  flags?: number; // search options bitmask
}

/**
 * Fetches translations from Yandex Dictionary API and transforms
 * the response to TranslationEntry format.
 */
export async function translateWithYandex(
  word: string,
  direction: string, // e.g. "en-ru"
  options: YandexDictOptions,
  maxResults = 5,
): Promise<TranslationEntry[]> {
  const url = new URL(YANDEX_DICT_API_URL);
  url.searchParams.set('key', options.apiKey);
  url.searchParams.set('lang', direction);
  url.searchParams.set('text', word);

  if (options.ui) {
    url.searchParams.set('ui', options.ui);
  }
  if (options.flags !== undefined) {
    url.searchParams.set('flags', String(options.flags));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yandex Dictionary API error: ${response.status} - ${errorText}`);
  }

  const data: YandexDictResponse = await response.json();

  logger.info({
    msg: 'Yandex Dictionary Response',
    word,
    direction,
    response: data,
  });

  return transformYandexResponse(data, maxResults);
}

/**
 * Transforms Yandex Dictionary response to TranslationEntry array.
 *
 * Yandex structure: def[] -> tr[] -> ex[]
 * Our structure: TranslationEntry with word, translation, pos, transcription, def, examples
 */
function transformYandexResponse(
  response: YandexDictResponse,
  maxResults: number,
): TranslationEntry[] {
  const results: TranslationEntry[] = [];

  for (const def of response.def) {
    if (results.length >= maxResults) {
      break;
    }

    const sourceWord = def.text;
    const transcription = def.ts || '';

    for (const tr of def.tr) {
      if (results.length >= maxResults) {
        break;
      }

      // Build definition from meanings (mean array)
      const definition = tr.mean
        ? tr.mean.map(m => m.text).join(', ')
        : '';

      // Build examples array
      const examples = (tr.ex || []).map(ex => ({
        original: ex.text,
        translation: ex.tr?.[0]?.text || '',
      }));

      // Pad examples to minimum 3 if needed (for consistency with LLM output)
      // Actually, per plan we'll allow fewer examples from Yandex

      const entry: TranslationEntry = {
        word: sourceWord,
        translation: tr.text,
        pos: tr.pos || def.pos,
        transcription,
        def: definition,
        examples,
      };

      results.push(entry);
    }
  }

  return results;
}
