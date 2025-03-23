import { createCallbackData } from 'callback-data';

export const confirmationData = createCallbackData('confirmation', {
  isConfirmed: Boolean,
});
