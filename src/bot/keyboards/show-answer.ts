import type { Context } from '#root/bot/context.js';
import { showAnswerData } from '#root/bot/callback-data/show-answer.js';
import { InlineKeyboard } from 'grammy';

export function createShowAnswerKeyboard(ctx: Context) {
  return InlineKeyboard.from([[{
    text: ctx.t('show-answer'),
    callback_data: showAnswerData.pack({}),
  }]]);
}
