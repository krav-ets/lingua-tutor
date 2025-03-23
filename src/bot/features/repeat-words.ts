import type { Context } from '#root/bot/context.js';
import { REPEAT_WORDS_CONVERSATION } from '#root/bot/conversations/index.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('repeat_words', logHandle('command-repeat-words'), (ctx) => {
  return ctx.conversation.enter(REPEAT_WORDS_CONVERSATION);
});

export { composer as repeatWordsFeature };
