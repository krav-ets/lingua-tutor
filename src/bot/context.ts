import type { Config } from '#root/config.js';
import type { Logger } from '#root/logger.js';
import type { PrismaClientX } from '#root/prisma/index.js';
import type { AutoChatActionFlavor } from '@grammyjs/auto-chat-action';
import type { ConversationFlavor } from '@grammyjs/conversations';
import type { HydrateFlavor } from '@grammyjs/hydrate';
import type { I18nFlavor } from '@grammyjs/i18n';
import type { MenuFlavor } from '@grammyjs/menu';
import type { ParseModeFlavor } from '@grammyjs/parse-mode';
import type { Update, UserFromGetMe } from '@grammyjs/types';
import type { User } from '@prisma/client';
import { type Api, Context as DefaultContext, type SessionFlavor } from 'grammy';

export interface SessionData {
  // field?: string;
}

interface ExtendedContextFlavor {
  logger: Logger;
  config: Config;
  prisma: PrismaClientX;
  user?: User | null;
}

export type Context = ParseModeFlavor<
  HydrateFlavor<
    DefaultContext &
    ExtendedContextFlavor &
    SessionFlavor<SessionData> &
    I18nFlavor &
    ConversationFlavor &
    AutoChatActionFlavor &
    MenuFlavor
  >
>;

interface Dependencies {
  logger: Logger;
  config: Config;
  prisma: PrismaClientX;
  user?: User | null;
}

export function createContextConstructor(
  {
    logger,
    config,
    prisma,
    user,
  }: Dependencies,
) {
  return class extends DefaultContext implements ExtendedContextFlavor {
    prisma: PrismaClientX;
    logger: Logger;
    config: Config;
    user?: User | null;

    constructor(update: Update, api: Api, me: UserFromGetMe) {
      super(update, api, me);

      this.logger = logger.child({
        update_id: this.update.update_id,
      });
      this.config = config;
      this.prisma = prisma;
      this.user = user;
    }
  } as unknown as new (update: Update, api: Api, me: UserFromGetMe) => Context;
}
