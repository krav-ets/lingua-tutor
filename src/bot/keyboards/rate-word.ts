import type { Context } from '#root/bot/context.js';
import { rateWordData } from '#root/bot/callback-data/rate-word.js';
import { chunk } from '#root/bot/helpers/keyboard.js';
import { InlineKeyboard } from 'grammy';

export async function createRateWordKeyboard(ctx: Context) {
  const rates = [
    { title: 'rate-word-0', value: 0 },
    { title: 'rate-word-1', value: 1 },
    { title: 'rate-word-2', value: 2 },
    { title: 'rate-word-3', value: 3 },
    { title: 'rate-word-4', value: 4 },
    { title: 'rate-word-5', value: 5 },
  ];

  const buttons = chunk(
    rates.map(({ title, value }) => ({
      text: ctx.t(title),
      callback_data: rateWordData.pack({
        rate: value,
        isFinish: false,
      }),
    })),
    6,
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
