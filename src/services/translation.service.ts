import type { TranslationEntry } from '#root/llm/tasks/translate.js';
import type { CompletionUsage } from 'openai/resources/index.mjs';
import { config } from '#root/config.js';
import { translate } from '#root/llm/tasks/translate.js';
import { translateWithYandex } from '#root/utils/yandex-dictionary.js';

/**
 * Result from translation service.
 * Usage is only present when using LLM translator.
 */
export interface TranslationResult {
  data: TranslationEntry[];
  usage?: CompletionUsage;
}

/**
 * Translation provider interface for strategy pattern.
 * Implement this interface to add new translation backends.
 */
export interface TranslationProvider {
  name: string;
  translate: (word: string, direction: string, maxResults?: number) => Promise<TranslationResult>;
}

/**
 * LLM-based translation provider using OpenAI/compatible API.
 */
const llmProvider: TranslationProvider = {
  name: 'llm',
  async translate(word: string, direction: string, maxResults = 5): Promise<TranslationResult> {
    const result = await translate(word, direction, maxResults);
    return {
      data: result.data,
      usage: result.usage,
    };
  },
};

/**
 * Yandex Dictionary API translation provider.
 */
const yandexProvider: TranslationProvider = {
  name: 'yandex',
  async translate(word: string, direction: string, maxResults = 5): Promise<TranslationResult> {
    const apiKey = config.yandexDict;
    if (!apiKey) {
      throw new Error('YANDEX_DICT API key is not configured');
    }

    const data = await translateWithYandex(word, direction, {
      apiKey,
      ui: 'ru', // Use Russian for part-of-speech names
    }, maxResults);

    return { data };
  },
};

/**
 * Registry of available translation providers.
 * Add new providers here to make them available for use.
 */
const providers: Record<string, TranslationProvider> = {
  llm: llmProvider,
  yandex: yandexProvider,
};

/**
 * Get the currently configured translation provider.
 */
function getProvider(): TranslationProvider {
  const mode = config.translationMode || 'llm';
  const provider = providers[mode];

  if (!provider) {
    throw new Error(`Unknown translation mode: ${mode}. Available modes: ${Object.keys(providers).join(', ')}`);
  }

  return provider;
}

/**
 * Translate a word using the configured translation provider.
 *
 * @param word - The word or phrase to translate
 * @param direction - Translation direction (e.g., "en-ru")
 * @param maxResults - Maximum number of translation variants to return
 * @returns Translation result with data and optional usage stats
 */
export async function translateWord(
  word: string,
  direction: string,
  maxResults = 5,
): Promise<TranslationResult> {
  const provider = getProvider();
  return provider.translate(word, direction, maxResults);
}

/**
 * Register a custom translation provider.
 * Use this to add new translation backends at runtime.
 *
 * @param provider - The translation provider to register
 */
export function registerTranslationProvider(provider: TranslationProvider): void {
  providers[provider.name] = provider;
}

/**
 * Get a list of available translation provider names.
 */
export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}
