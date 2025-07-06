import type { Context, ConversationContext } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { rateWordData } from '#root/bot/callback-data/rate-word.js';
import { showAnswerData } from '#root/bot/callback-data/show-answer.js';
import { createRateWordKeyboard } from '#root/bot/keyboards/rate-word.js';
import { createShowAnswerKeyboard } from '#root/bot/keyboards/show-answer.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { getNextWordToRepeat, reviewWord } from '#root/services/word-study.service.js';
import { createConversation } from '@grammyjs/conversations';

export const REPEAT_WORDS_CONVERSATION = 'repeat-words';

export function repeatWordsConversation() {
  return createConversation(
    async (conversation: Conversation<Context, ConversationContext>, ctx: ConversationContext) => {
      const tgUserId = ctx.from?.id;
      const user = await userRepository.findByTelegramId(tgUserId);
      if (!user) {
        return ctx.reply('User not found');
      }

      while (true) {
        const word = await getNextWordToRepeat(user?.id);

        // Если слов больше нет - завершаем
        if (word === null) {
          return await ctx.reply(ctx.t('study-finished'));
        }

        // Сначала показываем только слово и транскрипцию с кнопкой "Показать ответ"
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

        // После нажатия показываем полное сообщение с переводом и клавиатурой оценок
        const fullMessage = `<b>${word.word}</b> ${word.transcription}
<b>${word.translation}</b>`;

        // Клавиатура с вариантами оценки и кнопкой завершения
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
    REPEAT_WORDS_CONVERSATION,
  );
}
