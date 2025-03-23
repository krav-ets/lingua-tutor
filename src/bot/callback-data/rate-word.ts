import { createCallbackData } from 'callback-data';

export const rateWordData = createCallbackData('rate-word', {
  rate: Number,
  isFinish: Boolean,
});
