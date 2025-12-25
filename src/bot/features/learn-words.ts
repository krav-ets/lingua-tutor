import type { Context } from '#root/bot/context.js';
import { LEARN_WORDS_CONVERSATION } from '#root/bot/conversations/index.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('learn_words', logHandle('command-learn-words'), (ctx) => {
  return ctx.conversation.enter(LEARN_WORDS_CONVERSATION);
});

export { composer as learnWordsFeature };
