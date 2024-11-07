import type { Context, SessionData } from '#root/bot/context.js';
import { session as createSession, type Middleware, type SessionOptions } from 'grammy';

type Options = Pick<SessionOptions<SessionData, Context>, 'getSessionKey' | 'storage'>;

export function session(options: Options): Middleware<Context> {
  return createSession({
    getSessionKey: options.getSessionKey,
    storage: options.storage,
    initial: () => ({}),
  });
}
