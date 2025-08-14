import { createCallbackData } from 'callback-data';

export const addWordData = createCallbackData('add-word', {
  wordId: String,
  isCancel: Boolean,
});
