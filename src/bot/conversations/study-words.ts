import type { Context } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { confirmationData } from '#root/bot/callback-data/confirmation.ts';
import { rateWordData } from '#root/bot/callback-data/rate-word.ts';
import { REPEAT_WORDS_CONVERSATION } from '#root/bot/conversations/index.js';
import { i18n } from '#root/bot/i18n.js';
import { createConfirmationKeyboard } from '#root/bot/keyboards/confirmation.ts';
import { createRateWordKeyboard } from '#root/bot/keyboards/rate-word.ts';
import { userRepository } from '#root/repositories/user.repository.ts';
import { getNextWordToStudy, reviewWord } from '#root/services/word-study.service.ts';
import { createConversation } from '@grammyjs/conversations';

export const STUDY_WORDS_CONVERSATION = 'study-words';

export function studyWordsConversation() {
  return createConversation(
    async (conversation: Conversation<Context>, ctx: Context) => {
      await conversation.run(i18n);
      const tgUserId = ctx.from?.id;
      const user = await userRepository.findByTelegramId(tgUserId);
      if (!user) {
        return ctx.reply('User not found');
      }

      while (true) {
        const word = await getNextWordToStudy(user?.id);

        // Если слов больше нет - завершаем
        if (word === null) {
          const confirmationKeyboard = await createConfirmationKeyboard(ctx);
          await ctx.reply(ctx.t('no-more-new-words'), {
            reply_markup: confirmationKeyboard,
          });
          const response = await conversation.waitFor('callback_query:data');
          const { isConfirmed } = confirmationData.unpack(response.callbackQuery.data);
          if (isConfirmed) {
            await response.conversation.enter(REPEAT_WORDS_CONVERSATION);
          }
          else {
            await ctx.reply(ctx.t('study-finished'));
          }
          await ctx.api.editMessageReplyMarkup(
            ctx.chat!.id,
            response.callbackQuery.message!.message_id,
            { reply_markup: undefined },
          );
          return;
        }

        // Клавиатура с вариантами оценки и кнопкой завершения
        const keyboard = await createRateWordKeyboard(ctx);

        const message = `<b>${word.translation}</b>
<tg-spoiler>${word.word} ${word.transcription}</tg-spoiler>`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });

        // Ждем ответа пользователя
        const response = await conversation.waitFor('callback_query:data');
        const callbackData = rateWordData.unpack(response.callbackQuery.data);

        const updatedMessage = `${message}
Ваш результат: ${callbackData.rate}`;

        await ctx.api.editMessageText(
          ctx.chat!.id,
          response.callbackQuery.message!.message_id,
          updatedMessage,
        );

        // Если пользователь нажал "Завершить"
        if (callbackData.isFinish) {
          await ctx.reply(ctx.t('study-finished'));
          return;
        }

        await reviewWord({ userId: user.id, wordId: word.id, quality: callbackData.rate });

        // Обработка оценки (здесь можно добавить сохранение в БД)
        // console.log(`Word ${word.id} rated with score ${callbackData.rate}`);
      }
    },
    STUDY_WORDS_CONVERSATION,
  );
}
