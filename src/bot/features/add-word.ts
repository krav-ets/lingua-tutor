import type { Context } from '#root/bot/context.js';
import { addWordData } from '#root/bot/callback-data/add-word.js';
// import { chunk } from '#root/bot/helpers/keyboard.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { translate } from '#root/llm/tasks/translate.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { addTranslatedWordForUser } from '#root/services/user-words.service.js';
import { b, code, fmt, i, spoiler } from '@grammyjs/parse-mode';
import { Composer, InlineKeyboard } from 'grammy';

const composer = new Composer<Context>();

// Helper function to generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
    + Math.random().toString(36).substring(2, 15);
}

composer.chatType('private').on('message:text', logHandle('handle-word-input'), async (ctx) => {
  const word = ctx.message.text.trim();

  try {
    // Use the proper translate function from the LLM module
    const { data: results, usage } = await translate(word, 'en-ru');
    if (!results || results.length === 0) {
      return ctx.reply(ctx.t('word-not-found'));
    }

    ctx.logger.info({ msg: 'Translation usage', word, usage });

    // Initialize words storage in session if it doesn't exist
    if (!ctx.session.words) {
      ctx.session.words = {};
    }

    for (const [_, result] of results.entries()) {
      // Generate a unique ID for this translation result
      const wordId = generateId();

      // Store the result in the session
      ctx.session.words[wordId] = result;

      const keyboard = new InlineKeyboard()
        .text(
          ctx.t('start-learning'),
          addWordData.pack({ wordId, isCancel: false }), // Pass only the ID
        )
        .text(
          ctx.t('cancel'),
          addWordData.pack({ wordId, isCancel: true }),
        );

      let messageFmt = fmt`
${b}${result.word}${b} ${result.pos || ''}
${code}${result.translation}${code}

${i}Значение:${i}
${result.def}

${i}Примеры:${i}
`;

      for (const [idx, ex] of result.examples.entries()) {
        messageFmt = fmt`${messageFmt}${idx + 1}. ${ex.original}
${spoiler}${ex.translation}${spoiler}
`;
      }

      await ctx.reply(messageFmt.text, {
        entities: messageFmt.entities,
        reply_markup: keyboard,
      });
    }
  }
  catch (error) {
    ctx.logger.error(`Translation error: ${error}`);
    await ctx.reply(ctx.t('word-not-found'));
  }
});

// Обработчик кнопки "Начать учить"
composer.callbackQuery(
  addWordData.filter(),
  logHandle('handle-add-word'),
  async (ctx) => {
    const { wordId, isCancel } = addWordData.unpack(ctx.callbackQuery.data);

    // Retrieve the word data from the session
    const wordData = ctx.session.words?.[wordId];

    if (isCancel) {
      await ctx.deleteMessage();
    }
    else {
      // Find current app user by Telegram id
      const tgUserId = ctx.from?.id;
      const user = await userRepository.findByTelegramId(tgUserId);

      if (!user) {
        await ctx.answerCallbackQuery({ text: 'User not found. Use /start first.' });
      }
      else if (!wordData) {
        await ctx.answerCallbackQuery({
          text: 'Word data not found in session',
        });
      }
      else {
        // Determine direction from user settings, fallback to en→ru
        const languageCode = user.learningLanguageCode ?? 'en';
        const translationLanguageCode = user.nativeLanguageCode ?? 'ru';

        await addTranslatedWordForUser({
          userId: user.id,
          languageCode,
          translationLanguageCode,
          translation: wordData,
        });

        await ctx.answerCallbackQuery({
          text: ctx.t('word-added', { word: wordData.word }),
        });
      }
    }

    // Delete the word from the session after it's been processed
    if (ctx.session.words && wordId in ctx.session.words) {
      delete ctx.session.words[wordId];
    }

    // Убираем кнопку после нажатия
    await ctx.api.editMessageReplyMarkup(
      ctx.chat!.id,
      ctx.callbackQuery.message!.message_id,
      { reply_markup: undefined },
    );
  },
);

export { composer as addWordFeature };
