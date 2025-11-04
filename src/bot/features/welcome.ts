import type { Context } from '#root/bot/context.js';
import { GREETING_CONVERSATION } from '#root/bot/conversations/index.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { onboardingMenu } from '#root/bot/menus/onboarding.js';
import { b, fmt, i } from '@grammyjs/parse-mode';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('start', logHandle('command-start'), async (ctx) => {
  const messageFmt = fmt`
👋 ${ctx.t('welcome')}
${ctx.t('welcome-message1')}
${ctx.t('welcome-message2')}
`;
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

  await ctx.reply(messageFmt.text, { entities: messageFmt.entities });
  await ctx.reply(ctx.t('onboarding-start'), {
    reply_markup: onboardingMenu,
  });
});

feature.command('greeting', logHandle('command-greeting'), (ctx) => {
  return ctx.conversation.enter(GREETING_CONVERSATION);
});

export { composer as welcomeFeature };
