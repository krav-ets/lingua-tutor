import process from 'node:process';
import { API_CONSTANTS } from 'grammy';
import * as v from 'valibot';

const baseConfigSchema = v.object({
  debug: v.optional(v.pipe(v.string(), v.transform(JSON.parse), v.boolean()), 'false'),
  logLevel: v.optional(v.pipe(v.string(), v.picklist(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])), 'info'),
  botToken: v.pipe(v.string(), v.regex(/^\d+:[\w-]+$/, 'Invalid token')),
  botAllowedUpdates: v.optional(v.pipe(v.string(), v.transform(JSON.parse), v.array(v.picklist(API_CONSTANTS.ALL_UPDATE_TYPES))), '[]'),
  botAdmins: v.optional(v.pipe(v.string(), v.transform(JSON.parse), v.array(v.number())), '[]'),
  serverHost: v.optional(v.string(), '0.0.0.0'),
  serverPort: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '80'),
});

const configSchema = v.pipe(
  v.object({
    botMode: v.picklist(['polling', 'webhook']),
    ...baseConfigSchema.entries,
    botWebhook: v.optional(v.pipe(v.string(), v.url())),
    botWebhookSecret: v.optional(v.pipe(v.string(), v.minLength(12))),
  }),
  v.custom((value) => {
    const config = value as v.InferInput<typeof configSchema>;
    if (config.botMode === 'webhook') {
      if (!config.botWebhook || !config.botWebhookSecret) {
        return false;
      }
    }
    return true; // Успешная валидация
  }, '"botWebhook" and "botWebhookSecret" is required when "botMode" is "webhook"'),
  v.transform(input => ({
    ...input,
    isDebug: input.debug,
    isWebhookMode: input.botMode === 'webhook',
    isPollingMode: input.botMode === 'polling',
  })),
);

export type Config = v.InferOutput<typeof configSchema>;

export function createConfig(input: v.InferInput<typeof configSchema>) {
  return v.parse(configSchema, input);
}

export const config = createConfigFromEnvironment();

function createConfigFromEnvironment() {
  type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

  type KeysToCamelCase<T> = {
    [K in keyof T as CamelCase<string & K>]: T[K] extends object ? KeysToCamelCase<T[K]> : T[K]
  };

  function toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_match, p1) => p1.toUpperCase());
  }

  function convertKeysToCamelCase<T>(obj: T): KeysToCamelCase<T> {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelCaseKey = toCamelCase(key);
        result[camelCaseKey] = obj[key];
      }
    }
    return result;
  }

  try {
    process.loadEnvFile();
  }
  catch {
    // No .env file found
  }

  try {
    // @ts-expect-error create config from environment variables
    const config = createConfig(convertKeysToCamelCase(process.env));

    return config;
  }
  catch (error) {
    throw new Error('Invalid config', {
      cause: error,
    });
  }
}
