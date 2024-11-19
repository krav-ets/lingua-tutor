import type { Context } from '#root/bot/context.js';
import { userRepository } from '#root/repositories/user.repository.js';

export async function setLocaleMiddleware(ctx: Context, next: () => Promise<void>) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);

  if (user && user.uiLanguage) {
    ctx.i18n.setLocale(user.uiLanguage);
  }
  else if (ctx.from?.language_code) {
    ctx.i18n.setLocale(ctx.from.language_code);
  }
  else {
    ctx.i18n.setLocale('en'); // Default locale
  }
  await next();
};
