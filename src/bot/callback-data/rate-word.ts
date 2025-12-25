import { createCallbackData } from 'callback-data';

export const rateWordData = createCallbackData('rate-word', {
  wordId: Number,
  rate: Number,
  isFinish: Boolean,
});
