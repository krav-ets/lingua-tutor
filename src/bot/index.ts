import type { Context, SessionData } from '#root/bot/context.js';
import type { Config } from '#root/config.js';
import type { Logger } from '#root/logger.js';
import type { PrismaClientX } from '#root/prisma/index.js';
import type { BotConfig, StorageAdapter } from 'grammy';
import { createContextConstructor } from '#root/bot/context.js';
import { greetingConversation } from '#root/bot/conversations/index.js';
import { adminFeature } from '#root/bot/features/admin.js';
import { languageFeature } from '#root/bot/features/language.js';
import { settingsFeature } from '#root/bot/features/settings.js';
import { unhandledFeature } from '#root/bot/features/unhandled.js';
import { welcomeFeature } from '#root/bot/features/welcome.js';
import { errorHandler } from '#root/bot/handlers/error.js';
import { i18n, isMultipleLocales } from '#root/bot/i18n.js';
import { settingsMenu } from '#root/bot/menus/settings.js';
import { session } from '#root/bot/middlewares/session.js';
import { setLocaleMiddleware } from '#root/bot/middlewares/setLocale.js';
import { updateLogger } from '#root/bot/middlewares/update-logger.js';
import { autoChatAction } from '@grammyjs/auto-chat-action';
import { conversations } from '@grammyjs/conversations';
import { hydrate } from '@grammyjs/hydrate';
import { hydrateReply, parseMode } from '@grammyjs/parse-mode';
import { sequentialize } from '@grammyjs/runner';
import { Bot as TelegramBot } from 'grammy';

interface Dependencies {
  config: Config;
  logger: Logger;
  prisma: PrismaClientX;
}

interface Options {
  botSessionStorage?: StorageAdapter<SessionData>;
  botConfig?: Omit<BotConfig<Context>, 'ContextConstructor'>;
}

function getSessionKey(ctx: Omit<Context, 'session'>) {
  return ctx.chat?.id.toString();
}

export function createBot(token: string, dependencies: Dependencies, options: Options = {}) {
  const {
    config,
    logger,
    prisma,
  } = dependencies;

  const bot = new TelegramBot(token, {
    ...options.botConfig,
    ContextConstructor: createContextConstructor({
      logger,
      config,
      prisma,
    }),
  });
  const protectedBot = bot.errorBoundary(errorHandler);

  // Middlewares
  bot.api.config.use(parseMode('HTML'));

  if (config.isPollingMode)
    protectedBot.use(sequentialize(getSessionKey));
  if (config.isDebug)
    protectedBot.use(updateLogger());
  protectedBot.use(autoChatAction(bot.api));
  protectedBot.use(hydrateReply);
  protectedBot.use(hydrate());
  protectedBot.use(session({ getSessionKey, storage: options.botSessionStorage }));
  protectedBot.use(i18n);
  protectedBot.use(setLocaleMiddleware);
  protectedBot.use(conversations());
  protectedBot.use(greetingConversation());

  // Menus
  protectedBot.use(settingsMenu);

  // Handlers
  protectedBot.use(welcomeFeature);
  protectedBot.use(settingsFeature);
  protectedBot.use(adminFeature);
  if (isMultipleLocales)
    protectedBot.use(languageFeature);

  // must be the last handler
  protectedBot.use(unhandledFeature);

  return bot;
}

export type Bot = ReturnType<typeof createBot>;
