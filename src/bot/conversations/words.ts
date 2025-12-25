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
      const user = await conversation.external(() => userRepository.findByTelegramId(tgUserId));
      if (!user) {
        return ctx.reply('User not found');
      }

      // Начинаем с изучения новых слов, потом автоматически переходим к повторению
      let mode: WordsConversationMode = 'study';

      while (true) {
        const word = await conversation.external(() => getNextWord(user.id, mode));

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

        const info = word.info as unknown as {
          pos?: string;
          def?: string;
          examples?: { original: string; translation: string }[];
        };

        const pos = info.pos ? ` <i>${info.pos}</i>` : '';
        const examples = info.examples || [];
        // Используем conversation.random для детерминированного выбора при повторе
        const randomValue = await conversation.random();
        const randomExample = examples.length > 0
          ? examples[Math.floor(randomValue * examples.length)]
          : null;

        // Шаг 1: Показываем слово, POS и случайный пример (если есть)
        // Транскрипция убрана из этого шага, POS перенесен к слову
        const initialMessage = `<b>${word.word}</b>${pos}${randomExample ? `\n\n${randomExample.original}` : ''}`;
        const showAnswerKeyboard = createShowAnswerKeyboard(ctx, word.id);

        const initialReply = await ctx.reply(initialMessage, {
          reply_markup: showAnswerKeyboard,
          parse_mode: 'HTML',
        });

        // Ждем нажатия кнопки "Показать ответ"
        // Используем цикл, чтобы игнорировать посторонние callback'и (например, от старых сообщений)
        let showAnswerReceived = false;
        while (!showAnswerReceived) {
          const showAnswerResponse = await conversation.waitFor('callback_query:data');
          await showAnswerResponse.answerCallbackQuery();
          const data = showAnswerData.unpack(showAnswerResponse.callbackQuery.data);
          if (data && data.wordId === word.id) {
            showAnswerReceived = true;
          }
        }

        // Шаг 2: Показываем полное сообщение
        let fullMessage = `<b>${word.word}</b>${pos}\n`;
        if (word.transcription) {
          fullMessage += `${word.transcription}\n`;
        }
        fullMessage += `<b>${word.translation}</b>`;

        if (info.def) {
          fullMessage += `\n\n<i>Значение:</i>\n${info.def}`;
        }

        if (examples.length > 0) {
          fullMessage += `\n\n<i>Примеры:</i>`;
          examples.forEach((ex, idx) => {
            fullMessage += `\n${idx + 1}. ${ex.original}\n<span class="tg-spoiler">${ex.translation}</span>`;
          });
        }

        const rateKeyboard = await createRateWordKeyboard(ctx, word.id);

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
        // Используем цикл, чтобы игнорировать посторонние callback'и
        let callbackData: ReturnType<typeof rateWordData.unpack> | null = null;
        while (!callbackData) {
          const rateResponse = await conversation.waitFor('callback_query:data');
          await rateResponse.answerCallbackQuery();
          const unpacked = rateWordData.unpack(rateResponse.callbackQuery.data);
          if (unpacked && unpacked.wordId === word.id) {
            callbackData = unpacked;
          }
        }

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
\n—————————
Ваш результат: ${callbackData.rate}`;

        await ctx.api.editMessageText(
          ctx.chat!.id,
          initialReply.message_id,
          updatedMessage,
          {
            parse_mode: 'HTML',
          },
        );

        await conversation.external(() => reviewWord({ userId: user.id, wordId: word.id, quality: callbackData.rate }));
      }
    },
    LEARN_WORDS_CONVERSATION,
  );
}
