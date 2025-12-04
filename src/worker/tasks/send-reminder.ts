import type { Task } from 'graphile-worker';
import process from 'node:process';

import { reminderRepository } from '#root/repositories/reminder.repository.js';
import { userRepository } from '#root/repositories/user.repository.js';
import { scheduleNext } from '#root/services/reminder.service.js';
import { Api } from 'grammy';

const botToken = process.env.BOT_TOKEN;
const api = botToken ? new Api(botToken) : null;

function messageFor(lang?: string): string {
  switch (lang) {
    case 'ru':
      return 'Время повторить слова';
    default:
      return 'Time to review your words';
  }
}

export const sendReminder: Task = async (
  raw,
  { logger },
) => {
  const { reminderId } = (raw ?? {}) as { reminderId?: number };
  if (!reminderId)
    return;

  if (!api) {
    logger?.warn('sendReminder: BOT_TOKEN missing');
    return;
  }

  const reminder = await reminderRepository.findById(reminderId);
  if (!reminder || !reminder.isActive)
    return;

  const user = await userRepository.findById(reminder.userId);
  if (!user || !user.telegramId)
    return;

  try {
    await api.sendMessage(Number(user.telegramId), messageFor(user.uiLanguage));
  }
  catch (error) {
    logger?.warn(`sendReminder: sendMessage failed: ${String(error)}`);
  }

  await scheduleNext(reminderId);
};
