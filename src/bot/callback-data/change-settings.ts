import { createCallbackData } from 'callback-data';

export const changeSettingsData = createCallbackData('settings', {
  action: String,
  subcategory: String,
  option: String,
});
