import type { Context } from '#root/bot/context.js';
import { settingsMenu } from '#root/bot/menus/settings.js';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

// Command /settings open menu
composer.command('settings', async (ctx) => {
  await ctx.reply(ctx.t('main-settings'), {
    reply_markup: settingsMenu,
  });
});

export { composer as settingsFeature };
