import type { Context, ConversationContext } from '#root/bot/context.js';
import { confirmationData } from '#root/bot/callback-data/confirmation.js';
import { chunk } from '#root/bot/helpers/keyboard.js';
import { InlineKeyboard } from 'grammy';

export async function createConfirmationKeyboard(ctx: Context | ConversationContext) {
  const buttonList = [
    { title: 'confirmation-yes', value: true },
    { title: 'confirmation-no', value: false },
  ];

  const buttons = chunk(
    buttonList.map(({ title, value }) => ({
      text: ctx.t(title),
      callback_data: confirmationData.pack({
        isConfirmed: value,
      }),
    })),
    2,
  );

  return InlineKeyboard.from(buttons);
}
