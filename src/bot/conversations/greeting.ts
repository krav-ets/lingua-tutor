import type { Context, ConversationContext } from '#root/bot/context.js';
import type { Conversation } from '@grammyjs/conversations';
import { createConversation } from '@grammyjs/conversations';

export const GREETING_CONVERSATION = 'greeting';

export function greetingConversation() {
  return createConversation(
    async (conversation: Conversation<Context, ConversationContext>, ctx: ConversationContext) => {
      await ctx.reply('Please send me your name');

      while (true) {
        ctx = await conversation.wait();

        if (ctx.hasCommand('cancel')) {
          return ctx.reply('Cancelled');
        }
        else if (ctx.has('message:text')) {
          ctx.chatAction = 'typing';
          // await conversation.sleep(1000);

          await ctx.reply(`Hello, ${ctx.message.text}!`);
        }
        else {
          await ctx.reply('Please send me your name');
        }
      }
    },
    GREETING_CONVERSATION,
  );
}
