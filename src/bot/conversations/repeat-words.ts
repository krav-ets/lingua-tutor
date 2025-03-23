import type { Context } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { rateWordData } from '#root/bot/callback-data/rate-word.ts';
import { i18n } from '#root/bot/i18n.js';
import { createRateWordKeyboard } from '#root/bot/keyboards/rate-word.ts';
import { userRepository } from '#root/repositories/user.repository.ts';
import { getNextWordToRepeat, reviewWord } from '#root/services/word-study.service.ts';
import { createConversation } from '@grammyjs/conversations';

export const REPEAT_WORDS_CONVERSATION = 'repeat-words';

export function repeatWordsConversation() {
  return createConversation(
    async (conversation: Conversation<Context>, ctx: Context) => {
      await conversation.run(i18n);
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
    REPEAT_WORDS_CONVERSATION,
  );
}
