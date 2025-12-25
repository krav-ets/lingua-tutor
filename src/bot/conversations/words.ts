import type { Context, ConversationContext } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { rateWordData } from '#root/bot/callback-data/rate-word.js';
import { showAnswerData } from '#root/bot/callback-data/show-answer.js';
import { createRateWordKeyboard } from '#root/bot/keyboards/rate-word.js';
import { createShowAnswerKeyboard } from '#root/bot/keyboards/show-answer.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { getNextWord, reviewWord } from '#root/services/word-study.service.js';
import { createConversation } from '@grammyjs/conversations';

export type WordsConversationMode = 'study' | 'repeat';

export const LEARN_WORDS_CONVERSATION = 'learn-words';

export function learnWordsConversation() {
  return createConversation<Context, ConversationContext>(
    async (conversation: Conversation<Context, ConversationContext>, ctx: ConversationContext) => {
      const tgUserId = ctx.from?.id;
      const user = await userRepository.findByTelegramId(tgUserId);
      if (!user) {
        return ctx.reply('User not found');
      }

      // Начинаем с изучения новых слов, потом автоматически переходим к повторению
      let mode: WordsConversationMode = 'study';

      while (true) {
        const word = await getNextWord(user.id, mode);

        // Если слов больше нет
        if (word === null) {
          if (mode === 'study') {
            // Автоматически переключаемся на повторение
            mode = 'repeat';
            continue;
          }
          else {
            // mode === 'repeat' - все слова закончились
            await ctx.reply(ctx.t('study-finished'));
            return;
          }
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
    LEARN_WORDS_CONVERSATION,
  );
}
