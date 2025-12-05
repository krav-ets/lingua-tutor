import type { Context } from '#root/bot/context.js';
import { i18n } from '#root/bot/i18n.js';
import { languageRepository } from '#root/repositories/language.repository.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { wordCollectionRepository } from '#root/repositories/word-collection.repository.js';
import { disableRemindersForUser, enableRemindersForUser, isRemindersEnabled, updateReminderTime } from '#root/services/reminder.service.js';
import { addCollectionToUser, removeCollectionFromUser } from '#root/services/user.service.js';
import { Menu } from '@grammyjs/menu';
import ISO6391 from 'iso-639-1';
import { timePickerMenu } from '../features/time-picker.js';

const nativeLanguageMenu = new Menu<Context>('native-language-menu')
  .dynamic(async (ctx, range) => {
    const tgUserId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(tgUserId);
    const languages = await languageRepository.findAll() ?? [];

    for (const { code } of languages) {
      const isActive = code === user?.nativeLanguageCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(tgUserId, {
          nativeLanguage: { connect: { code } },
        });

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

const learningLanguageMenu = new Menu<Context>('learning-language-menu')
  .dynamic(async (ctx, range) => {
    const tgUserId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(tgUserId);
    const languages = await languageRepository.findAll() ?? [];
    const filteredLanguages = languages.filter(({ code }) => code !== user?.nativeLanguageCode);

    for (const { code } of filteredLanguages) {
      const isActive = code === user?.learningLanguageCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(tgUserId, {
          learningLanguage: { connect: { code } },
        });

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

const uiLanguageMenu = new Menu<Context>('ui-language-menu')
  .dynamic(async (ctx, range) => {
    const tgUserId = ctx.from?.id;
    const currentLocaleCode = await ctx.i18n.getLocale();
    const allAvailableLocales = i18n.locales;
    for (const code of allAvailableLocales) {
      const isActive = code === currentLocaleCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(tgUserId, { uiLanguage: code });
        await ctx.i18n.setLocale(code);
        await ctx.editMessageText(ctx.t('settings-ui-description'));

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

const categoriesMenu = new Menu<Context>('categories-menu')
  .dynamic(async (ctx, range) => {
    const tgUserId = ctx.from?.id;
    if (!tgUserId) {
      return;
    }
    const user = await userRepository.findByTelegramId(tgUserId);
    if (!user) {
      return;
    }
    const userWordCollections = await wordCollectionRepository.findByLanguages(
      { language: user?.learningLanguageCode, translationLanguage: user?.nativeLanguageCode },
      user?.id,
    ) ?? [];
    const userWordCollectionsSet = new Set(userWordCollections.map(({ id }) => id));
    const wordCollections = await wordCollectionRepository.findByLanguages(
      { language: user?.learningLanguageCode, translationLanguage: user?.nativeLanguageCode },
    ) ?? [];

    for (const collection of wordCollections) {
      const { id, title, languageCode, translationLanguageCode } = collection;
      const isSelected = userWordCollectionsSet.has(id);
      const label = `${isSelected ? '✅ ' : ''}${title} [${languageCode}-${translationLanguageCode}]`;

      range.text(label, async (ctx) => {
        if (isSelected) {
          await removeCollectionFromUser(user.id, id);
        }
        else {
          await addCollectionToUser(user.id, id);
        }

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

const dailyWordsMenu = new Menu<Context>('daily-words-menu')
  .dynamic(async (ctx, range) => {
    const WORD_COUNT_LIST = [3, 5, 7, 10, 15, 25, 40];

    const tgUserId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(tgUserId);

    for (const count of WORD_COUNT_LIST) {
      const isActive = count === user?.wordsPerDay;
      const label = `${isActive ? '✅ ' : ''}${count}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(tgUserId, { wordsPerDay: count });

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

const remindersMenu = new Menu<Context>('reminders-menu')
  .text(async (ctx) => {
    const user = await userRepository.findByTelegramId(ctx.from?.id);
    const enabled = user ? await isRemindersEnabled(user.id) : false;
    return `${enabled ? '✅ ' : '⬜ '}${ctx.t('reminder-enabled-label')}`;
  }, async (ctx) => {
    const user = await userRepository.findByTelegramId(ctx.from?.id);
    if (!user)
      return;
    const enabled = await isRemindersEnabled(user.id);
    if (enabled) {
      await disableRemindersForUser(user.id);
    }
    else {
      await enableRemindersForUser(user.id);
    }
    await ctx.menu.update();
  })
  .row()
  .text(async (ctx) => {
    // TODO: fetch current reminder time from DB to show in button label if needed
    // For now just "Set time"
    return ctx.t('set-time');
  }, async (ctx) => {
    // Initialize session time picker with current user settings if available
    // For now default to 12:00 or whatever is in DB if we fetch it
    // We need to fetch the current reminder time to pre-fill the picker
    // But the current service doesn't easily expose it without fetching the reminder object
    // Let's assume we start with 12:00 or keep previous session state
    if (!ctx.session.timePicker) {
      ctx.session.timePicker = { hour: 12, minute: 0 };
    }
    await ctx.menu.nav('time-picker-menu');
  })
  .row()
  .text(ctx => ctx.t('save'), async (ctx) => {
    // If we came back from time picker, we might want to save the time
    if (ctx.session.timePicker) {
      const { hour, minute } = ctx.session.timePicker;
      const timeString = `${String(hour ?? '00').padStart(2, '0')}:${String(minute ?? '00').padStart(2, '0')}`;
      const user = await userRepository.findByTelegramId(ctx.from?.id);
      if (user) {
        await updateReminderTime(user.id, timeString);
      }
      // Clear session after saving? Maybe keep it for UI consistency until closed
      // delete ctx.session.timePicker;
    }
    await ctx.editMessageText(ctx.t('main-settings'));
    ctx.menu.back();
  });

remindersMenu.register(timePickerMenu);

async function nativeButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  return `${ctx.t('settings-native')} [${user?.nativeLanguageCode || '--'}]`;
};
async function languageButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  return `${ctx.t('settings-learning')} [${user?.learningLanguageCode || '--'}]`;
};
async function uiButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  return `${ctx.t('settings-ui')} [${user?.uiLanguage || '--'}]`;
};
async function categoriesButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  const userWordCollections = await wordCollectionRepository.findByLanguages(
    { language: user?.learningLanguageCode, translationLanguage: user?.nativeLanguageCode },
    user?.id,
  );
  return `${ctx.t('settings-categories')} [${userWordCollections?.length || '--'}]`;
};
async function dailyButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  return `${ctx.t('settings-daily')} [${user?.wordsPerDay || '--'}]`;
};
// label with checkbox
async function remindersButton(ctx: Context) {
  return ctx.t('settings-reminders');
};
async function moveToReminders(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-reminders-description'));
  await ctx.menu.nav('reminders-menu');
};
function doneButton(ctx: Context) {
  return ctx.t('done');
};

async function moveToNative(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-native-description'));
  await ctx.menu.nav('native-language-menu');
};
async function moveToLearning(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-learning-description'));
  await ctx.menu.nav('learning-language-menu');
};
async function moveToUi(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-ui-description'));
  await ctx.menu.nav('ui-language-menu');
};
async function moveToCategories(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-categories-description'));
  await ctx.menu.nav('categories-menu');
};
async function moveToDailyWords(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-daily-description'));
  await ctx.menu.nav('daily-words-menu');
};
async function closeSettings(ctx: Context) {
  await ctx.editMessageText(ctx.t('settings-done-description'));
  await ctx.menu.close();
};

// Main settings
export const settingsMenu = new Menu<Context>('settings-menu')
  .text(nativeButton, moveToNative)
  .row()
  .text(languageButton, moveToLearning)
  .row()
  .text(uiButton, moveToUi)
  .row()
  .text(categoriesButton, moveToCategories)
  .row()
  .text(dailyButton, moveToDailyWords)
  .row()
  .text(remindersButton, moveToReminders)
  .row()
  .text(doneButton, closeSettings);

// submenu registartion
settingsMenu.register(nativeLanguageMenu);
settingsMenu.register(learningLanguageMenu);
settingsMenu.register(uiLanguageMenu);
settingsMenu.register(categoriesMenu);
settingsMenu.register(dailyWordsMenu);
settingsMenu.register(remindersMenu);
