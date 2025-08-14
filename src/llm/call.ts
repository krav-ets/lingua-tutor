import type { CompletionUsage } from 'openai/resources/index.mjs';

import type { FunctionParameters } from 'openai/resources/shared';
import type { GenericSchema, InferOutput } from 'valibot';
import { config } from '#root/config.js';
import { parse as parseWithValibot } from 'valibot';
import { openAIClient } from './client.js';
import { renderPrompt } from './promptLoader.js';

interface CallWithToolOptions<T extends GenericSchema> {
  promptName: string;
  promptVars: Record<string, unknown>;
  schema: T;
  toolName: string;
  jsonSchema: FunctionParameters;
  model?: string;
  temperature?: number;
}

export async function callLLMWithTool<T extends GenericSchema>({
  promptName,
  promptVars,
  schema,
  toolName,
  jsonSchema,
  model = config.llmModel ?? 'gpt-4.1-nano',
  temperature = config.llmTemperature ?? 0.2,
}: CallWithToolOptions<T>): Promise<{ data: InferOutput<T>; usage: CompletionUsage | undefined }> {
  const { system, user } = await renderPrompt(promptName, promptVars);

  const res = await openAIClient.chat.completions.create({
    model,
    temperature,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    tools: [{ type: 'function', function: { name: toolName, description: 'Saves the structured information.', parameters: jsonSchema } }],
    tool_choice: { type: 'function', function: { name: toolName } },
  });

  const message = res.choices[0].message;
  const usage = res.usage;
  const toolCall = message.tool_calls?.[0];

  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('LLM did not use the required tool.');
  }

  const rawArguments = toolCall.function.arguments;
  try {
    const json = JSON.parse(rawArguments);
    const data = parseWithValibot(schema, json);
    return { data, usage };
  }
  catch (err) {
    console.error('LLM response validation failed:', { error: (err as Error).message, rawResponse: rawArguments });
    throw new Error(`LLM response validation failed. Raw response: ${rawArguments}`);
  }
}

interface CallForTextOptions {
  promptName: string;
  promptVars: Record<string, unknown>;
  model?: string;
  temperature?: number;
}

export async function callLLMForText({
  promptName,
  promptVars,
  model = config.llmModel ?? 'gpt-4o-mini',
  temperature = 0.7,
}: CallForTextOptions): Promise<{ text: string; usage: CompletionUsage | undefined }> {
  const { system, user } = await renderPrompt(promptName, promptVars);

  const res = await openAIClient.chat.completions.create({
    model,
    temperature,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });

  const text = res.choices[0].message.content ?? '';
  const usage = res.usage;

  return { text, usage };
}
