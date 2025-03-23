import type { Context } from '#root/bot/context.js';
import { rateWordData } from '#root/bot/callback-data/rate-word.ts';
import { chunk } from '#root/bot/helpers/keyboard.js';
import { InlineKeyboard } from 'grammy';

export async function createRateWordKeyboard(ctx: Context) {
  const rates = [
    { title: 'rate-word-0', value: 0 }, // "Не знаю" (0)
    { title: 'rate-word-3', value: 3 }, // "Тяжело вспоминал" (3)
    { title: 'rate-word-4', value: 4 }, // "Быстро вспомнил" (4)
    { title: 'rate-word-5', value: 5 }, // "Знаю" (5)
  ];

  const buttons = chunk(
    rates.map(({ title, value }) => ({
      text: ctx.t(title),
      callback_data: rateWordData.pack({
        rate: value,
        isFinish: false,
      }),
    })),
    4,
  );

  const finishButton = [{
    text: ctx.t('finish'),
    callback_data: rateWordData.pack({
      rate: 999,
      isFinish: true,
    }),
  }];

  buttons.push(finishButton);

  return InlineKeyboard.from(buttons);
}
