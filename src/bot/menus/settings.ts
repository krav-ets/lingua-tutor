import type { Context } from '#root/bot/context.js';
import { i18n } from '#root/bot/i18n.js';
import { languageRepository } from '#root/repositories/language.repository.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { wordCollectionRepository } from '#root/repositories/word-collection.repository.js';
import { Menu } from '@grammyjs/menu';
import ISO6391 from 'iso-639-1';

const nativeLanguageMenu = new Menu<Context>('native-language-menu')
  .dynamic(async (ctx, range) => {
    const userId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(userId);
    const languages = await languageRepository.findAll() ?? [];

    for (const { code } of languages) {
      const isActive = code === user?.nativeLanguageCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(userId, {
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
    const userId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(userId);
    const languages = await languageRepository.findAll() ?? [];
    const filteredLanguages = languages.filter(({ code }) => code !== user?.nativeLanguageCode);

    for (const { code } of filteredLanguages) {
      const isActive = code === user?.learningLanguageCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(userId, {
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
    const userId = ctx.from?.id;
    const currentLocaleCode = await ctx.i18n.getLocale();
    const allAvailableLocales = i18n.locales;

    for (const code of allAvailableLocales) {
      const isActive = code === currentLocaleCode;
      const label = `${isActive ? '✅ ' : ''}${ISO6391.getNativeName(code)}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(userId, { uiLanguage: code });

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
    const userId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(userId);
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
        await userRepository.updateByTelegramId(userId, {
          selectedCollections: {
            [isSelected ? 'disconnect' : 'connect']: { id },
          },
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

const dailyWordsMenu = new Menu<Context>('daily-words-menu')
  .dynamic(async (ctx, range) => {
    const WORD_COUNT_LIST = [3, 5, 7, 10, 15, 25, 40];

    const userId = ctx.from?.id;
    const user = await userRepository.findByTelegramId(userId);

    for (const count of WORD_COUNT_LIST) {
      const isActive = count === user?.wordsPerDay;
      const label = `${isActive ? '✅ ' : ''}${count}`;

      range.text(label, async (ctx) => {
        await userRepository.updateByTelegramId(userId, { wordsPerDay: count });

        await ctx.menu.update();
      });
    }

    range.row();
    range.text(ctx => ctx.t('save'), async (ctx) => {
      await ctx.editMessageText(ctx.t('main-settings'));
      ctx.menu.back();
    });
  });

async function nativeButton(ctx: Context) {
  const userId = ctx.from?.id;
  const user = await userRepository.findByTelegramId(userId);
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
  return `${ctx.t('settings-categories')} [${'--'}]`;
};
async function dailyButton(ctx: Context) {
  const user = await userRepository.findByTelegramId(ctx.from?.id);
  return `${ctx.t('settings-daily')} [${user?.wordsPerDay || '--'}]`;
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
  .text(doneButton, closeSettings);

// submenu registartion
settingsMenu.register(nativeLanguageMenu);
settingsMenu.register(learningLanguageMenu);
settingsMenu.register(uiLanguageMenu);
settingsMenu.register(categoriesMenu);
settingsMenu.register(dailyWordsMenu);
