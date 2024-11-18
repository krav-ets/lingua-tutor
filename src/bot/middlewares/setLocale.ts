import type { Context } from '#root/bot/context.js';

export async function setLocaleMiddleware(ctx: Context, next: () => Promise<void>) {
  if (ctx.user && ctx.user.uiLanguage) {
    ctx.i18n.setLocale(ctx.user.uiLanguage);
  }
  else if (ctx.from?.language_code) {
    ctx.i18n.setLocale(ctx.from.language_code);
  }
  else {
    ctx.i18n.setLocale('en'); // Default locale
  }
  await next();
};
