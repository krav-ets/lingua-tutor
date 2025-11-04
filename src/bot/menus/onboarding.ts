import type { Context } from '#root/bot/context.js';
import { i18n } from '#root/bot/i18n.js';
import { languageRepository } from '#root/repositories/language.repository.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { wordCollectionRepository } from '#root/repositories/word-collection.repository.js';
import { addCollectionToUser, removeCollectionFromUser } from '#root/services/user.service.js';
import { Menu } from '@grammyjs/menu';
import ISO6391 from 'iso-639-1';

const nativeLanguageMenu = new Menu<Context>('onboarding-native-language-menu')
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
    range.text(ctx => ctx.t('next'), async (ctx) => {
      await ctx.editMessageText(ctx.t('settings-learning-description'));
      await ctx.menu.nav('onboarding-learning-language-menu');
    });
  });

const learningLanguageMenu = new Menu<Context>('onboarding-learning-language-menu')
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
    range.text(ctx => ctx.t('next'), async (ctx) => {
      await ctx.editMessageText(ctx.t('settings-ui-description'));
      await ctx.menu.nav('onboarding-ui-language-menu');
    });
  });

const uiLanguageMenu = new Menu<Context>('onboarding-ui-language-menu')
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
    range.text(ctx => ctx.t('next'), async (ctx) => {
      await ctx.editMessageText(ctx.t('settings-categories-description'));
      await ctx.menu.nav('onboarding-categories-menu');
    });
  });

const categoriesMenu = new Menu<Context>('onboarding-categories-menu')
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

      range.row();
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
    range.text(ctx => ctx.t('next'), async (ctx) => {
      await ctx.editMessageText(ctx.t('settings-daily-description'));
      await ctx.menu.nav('onboarding-daily-words-menu');
    });
  });

const dailyWordsMenu = new Menu<Context>('onboarding-daily-words-menu')
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
    range.text(ctx => ctx.t('done'), async (ctx) => {
      await ctx.editMessageText(ctx.t('onboarding-finished'));
      await ctx.menu.close();
    });
  });

// Main settings
export const onboardingMenu = new Menu<Context>('onboarding-menu')
  .text(ctx => ctx.t('start'), async (ctx) => {
    await ctx.editMessageText(ctx.t('settings-native-description'));
    await ctx.menu.nav('onboarding-native-language-menu');
  });

// submenu registartion
onboardingMenu.register(nativeLanguageMenu);
onboardingMenu.register(learningLanguageMenu);
onboardingMenu.register(uiLanguageMenu);
onboardingMenu.register(categoriesMenu);
onboardingMenu.register(dailyWordsMenu);
