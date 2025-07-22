import type { CompletionUsage } from 'openai/resources/index.mjs';
import type { FunctionParameters } from 'openai/resources/shared';
import type { InferOutput } from 'valibot';
import { toJsonSchema } from '@valibot/to-json-schema';
import { array, maxLength, minLength, object, optional, pipe, string } from 'valibot';
import { callLLMWithTool } from '../call.js';

// Схемы valibot - наш "источник правды"
const ExampleSchema = object({
  original: string(),
  translation: string(),
});

const TranslationSchema = object({
  word: string(),
  translation: string(),
  pos: optional(string()),
  transcription: string(),
  def: string(),
  examples: pipe(array(ExampleSchema), minLength(2)),
});

const ResponseSchema = object({
  translations: pipe(array(TranslationSchema), maxLength(5)),
});

const ResponseJsonSchema = toJsonSchema(ResponseSchema) as FunctionParameters;

export type TranslationEntry = InferOutput<typeof TranslationSchema>;

export async function translate(
  word: string,
  direction: string,
  maxResults = 5,
): Promise<{ data: TranslationEntry[]; usage: CompletionUsage | undefined }> {
  const { data, usage } = await callLLMWithTool({
    promptName: 'translate',
    promptVars: { word, direction, maxResults },
    schema: ResponseSchema,
    toolName: 'save_translation_data',
    jsonSchema: ResponseJsonSchema,
  });

  return { data: data.translations, usage };
}
