import type { Context } from '#root/bot/context.js';
import { GREETING_CONVERSATION } from '#root/bot/conversations/index.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('start', logHandle('command-start'), async (ctx) => {
  const userId = ctx.from.id;

  let user = await ctx.prisma.user.findUnique({
    where: { telegramId: userId },
  });

  if (!user) {
    user = await ctx.prisma.user.create({
      data: {
        telegramId: userId,
        username: ctx.from.username || null,
        uiLanguage: ctx.from.language_code,
      },
    });
  }
  return ctx.reply(ctx.t('welcome'));
});

feature.command('greeting', logHandle('command-greeting'), (ctx) => {
  return ctx.conversation.enter(GREETING_CONVERSATION);
});

export { composer as welcomeFeature };
