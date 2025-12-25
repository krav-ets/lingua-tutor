import type { Context, ConversationContext } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { confirmationData } from '#root/bot/callback-data/confirmation.js';
import { rateWordData } from '#root/bot/callback-data/rate-word.js';
import { showAnswerData } from '#root/bot/callback-data/show-answer.js';
import { createConfirmationKeyboard } from '#root/bot/keyboards/confirmation.js';
import { createRateWordKeyboard } from '#root/bot/keyboards/rate-word.js';
import { createShowAnswerKeyboard } from '#root/bot/keyboards/show-answer.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { getNextWord, reviewWord } from '#root/services/word-study.service.js';
import { createConversation } from '@grammyjs/conversations';

export type WordsConversationMode = 'study' | 'repeat';

export const WORDS_CONVERSATION = 'words';

export function wordsConversation() {
  return createConversation<Context, ConversationContext>(
    async (conversation: Conversation<Context, ConversationContext>, ctx: ConversationContext) => {
      const tgUserId = ctx.from?.id;
      const user = await userRepository.findByTelegramId(tgUserId);
      if (!user) {
        return ctx.reply('User not found');
      }

      // Получаем режим из сессии через external (session недоступна напрямую в ConversationContext)
      let mode: WordsConversationMode = await conversation.external(
        outsideCtx => outsideCtx.session.wordsMode ?? 'study',
      );

      while (true) {
        const word = await getNextWord(user.id, mode);

        // Если слов больше нет
        if (word === null) {
          if (mode === 'study') {
            // Предлагаем перейти к повторению
            const confirmationKeyboard = await createConfirmationKeyboard(ctx);
            await ctx.reply(ctx.t('no-more-new-words'), {
              reply_markup: confirmationKeyboard,
            });
            const response = await conversation.waitFor('callback_query:data');
            const { isConfirmed } = confirmationData.unpack(response.callbackQuery.data);

            await ctx.api.editMessageReplyMarkup(
              ctx.chat!.id,
              response.callbackQuery.message!.message_id,
              { reply_markup: undefined },
            );

            if (isConfirmed) {
              // Переключаем режим на repeat и продолжаем цикл
              mode = 'repeat';
              await conversation.external((outsideCtx) => {
                outsideCtx.session.wordsMode = 'repeat';
              });
              continue;
            }
            else {
              await ctx.reply(ctx.t('study-finished'));
            }
          }
          else {
            // mode === 'repeat'
            await ctx.reply(ctx.t('study-finished'));
          }
          return;
        }

        // Шаг 1: Показываем слово и кнопку "Показать ответ"
        const initialMessage = `<b>${word.word}</b> ${word.transcription}`;
        const showAnswerKeyboard = createShowAnswerKeyboard(ctx);

        const initialReply = await ctx.reply(initialMessage, {
          reply_markup: showAnswerKeyboard,
          parse_mode: 'HTML',
        });

        // Ждем нажатия кнопки "Показать ответ"
        const showAnswerResponse = await conversation.waitFor('callback_query:data');
        if (!showAnswerData.unpack(showAnswerResponse.callbackQuery.data)) {
          continue;
        }

        // Шаг 2: Показываем полное сообщение с переводом и клавиатурой оценок
        const fullMessage = `<b>${word.word}</b> ${word.transcription}
<b>${word.translation}</b>`;

        const rateKeyboard = await createRateWordKeyboard(ctx);

        await ctx.api.editMessageText(
          ctx.chat!.id,
          initialReply.message_id,
          fullMessage,
          {
            reply_markup: rateKeyboard,
            parse_mode: 'HTML',
          },
        );

        // Ждем ответа пользователя с оценкой
        const rateResponse = await conversation.waitFor('callback_query:data');
        const callbackData = rateWordData.unpack(rateResponse.callbackQuery.data);

        // Если пользователь нажал "Завершить"
        if (callbackData.isFinish) {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            initialReply.message_id,
            ctx.t('study-finished'),
          );
          return;
        }

        const updatedMessage = `${fullMessage}
Ваш результат: ${callbackData.rate}`;

        await ctx.api.editMessageText(
          ctx.chat!.id,
          rateResponse.callbackQuery.message!.message_id,
          updatedMessage,
          {
            parse_mode: 'HTML',
          },
        );

        await reviewWord({ userId: user.id, wordId: word.id, quality: callbackData.rate });
      }
    },
    WORDS_CONVERSATION,
  );
}
