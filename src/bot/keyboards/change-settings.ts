import type { Context } from '#root/bot/context.js';
import { changeLanguageData } from '#root/bot/callback-data/change-language.js';
import { chunk } from '#root/bot/helpers/keyboard.js';
import { i18n } from '#root/bot/i18n.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { InlineKeyboard } from 'grammy';

export async function createChangeMainSettingsKeyboard(ctx: Context) {
  const userId = ctx.from?.id;
  const user = await userRepository.findByTelegramId(userId);

  const nativeLabel = `${ctx.t('settings-native')} [${user?.nativeLanguageCode || '--'}]`;
  const learningLabel = `${ctx.t('settings-learning')} [${user?.learningLanguageCode || '--'}]`;
  const uiLabel = `${ctx.t('settings-ui')} [${user?.uiLanguage || '--'}]`;
  const categoriesLabel = `${ctx.t('settings-categories')} [${'--'}]`;
  const doneLabel = `${ctx.t('settings-done')}`;
  return new InlineKeyboard()
    .text(nativeLabel, 'settings:native')
    .row()
    .text(learningLabel, 'settings:learning')
    .row()
    .text(uiLabel, 'settings:ui')
    .row()
    .text(categoriesLabel, 'settings:categories')
    .row()
    .text(doneLabel, 'settings:done')
    .row();
}
