import type { Context, ConversationContext } from '#root/bot/context.js';
import { showAnswerData } from '#root/bot/callback-data/show-answer.js';
import { InlineKeyboard } from 'grammy';

export function createShowAnswerKeyboard(ctx: Context | ConversationContext) {
  return InlineKeyboard.from([[{
    text: ctx.t('show-answer'),
    callback_data: showAnswerData.pack({}),
  }]]);
}
