import type { Context } from '#root/bot/context.js';
import { STUDY_WORDS_CONVERSATION } from '#root/bot/conversations/index.js';
import { logHandle } from '#root/bot/helpers/logging.js';
import { Composer } from 'grammy';

const composer = new Composer<Context>();

const feature = composer.chatType('private');

feature.command('study_words', logHandle('command-study-words'), (ctx) => {
  return ctx.conversation.enter(STUDY_WORDS_CONVERSATION);
});

export { composer as studyWordsFeature };
