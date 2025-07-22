import { config } from '#root/config.js';
import OpenAI from 'openai';

export const openAIClient = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmApiUrl,
});
