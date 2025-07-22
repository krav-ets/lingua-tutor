import type { Context } from '#root/bot/context.js';
import { addWordData } from '#root/bot/callback-data/add-word.js';
// import { chunk } from '#root/bot/helpers/keyboard.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { translate } from '#root/llm/tasks/translate.js';
import { Composer, InlineKeyboard } from 'grammy';

const composer = new Composer<Context>();

composer.chatType('private').on('message:text', logHandle('handle-word-input'), async (ctx) => {
  const word = ctx.message.text.trim();

  try {
    // Use the proper translate function from the LLM module
    const { data: results, usage } = await translate(word, 'en-ru');
    if (!results || results.length === 0) {
      return ctx.reply(ctx.t('word-not-found'));
    }

    ctx.logger.info(`Translation usage: ${JSON.stringify(usage)}`);

    for (const [index, result] of results.entries()) {
      const keyboard = new InlineKeyboard()
        .text(
          ctx.t('start-learning'),
          addWordData.pack({ wordId: index }),
        );

      const message = `<b>${result.translation}</b> (${result.transcription})\n`
        + `<i>Значение:</i>\n${result.def}\n\n`
        + `<i>Примеры:</i>\n${result.examples.map(({ original }) => original).join('\n')}`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
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
    // const { wordId } = addWordData.unpack(ctx.callbackQuery.data);

    // TODO: Реализовать добавление в БД
    /* ctx.logger.info(`Adding word: ${word}, index: ${meaningIndex}`);

    await ctx.answerCallbackQuery({
      text: ctx.t('word-added', { word }),
    }); */

    // Убираем кнопку после нажатия
    await ctx.api.editMessageReplyMarkup(
      ctx.chat!.id,
      ctx.callbackQuery.message!.message_id,
      { reply_markup: undefined },
    );
  },
);

export { composer as addWordFeature };
