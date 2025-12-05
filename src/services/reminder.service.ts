import type { Reminder } from '@prisma/client';
import { reminderRepository } from '#root/repositories/reminder.repository.js';
import { getWorkerUtils } from '#root/worker/utils.js';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

const TASK = 'send_reminder';
const DEFAULT_TIME_LOCAL = '14:50';
const DEFAULT_TIME_ZONE = 'UTC';

function parseHm(hm: string): { h: number; m: number } {
  const [hours, minutes] = hm.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new TypeError(`Bad timeLocal: ${hm}`);
  }
  return { h: hours, m: minutes };
}

export function getNextRunAtUtc(
  timeLocal?: string | null,
  timeZone?: string | null,
  now: Date = new Date(),
): Date {
  const tz = timeZone || DEFAULT_TIME_ZONE;
  const hm = timeLocal || DEFAULT_TIME_LOCAL;

  const nowTz = new TZDate(now, tz);
  const { h, m } = parseHm(hm);

  const todayCandidate = new TZDate(
    nowTz.getFullYear(),
    nowTz.getMonth(),
    nowTz.getDate(),
    h,
    m,
    0,
    0,
    tz,
  );

  const runTz = todayCandidate.getTime() <= nowTz.getTime()
    ? new TZDate(
      nowTz.getFullYear(),
      nowTz.getMonth(),
      nowTz.getDate() + 1,
      h,
      m,
      0,
      0,
      tz,
    )
    : todayCandidate;

  return new Date(runTz.getTime());
}

export async function scheduleNext(reminderId: number) {
  const reminder = await reminderRepository.findById(reminderId);
  if (!reminder)
    return;

  const schedulingReminder = reminder as ReminderWithSchedule;
  if (!schedulingReminder.isActive)
    return;
  const runAt = getNextRunAtUtc(schedulingReminder.timeLocal, schedulingReminder.timeZone);
  await reminderRepository.setNextRunAt(reminderId, runAt);

  const workerUtils = await getWorkerUtils();
  const jobKey = `reminder:${reminderId}:${format(runAt, 'yyyy-MM-dd')}`;
  await workerUtils.addJob(
    TASK,
    { reminderId },
    {
      runAt,
      jobKey,
      jobKeyMode: 'replace',
    },
  );
}

export async function enableRemindersForUser(userId: number) {
  const reminder = await reminderRepository.upsertDefault(userId, {
    timeLocal: DEFAULT_TIME_LOCAL,
    timeZone: DEFAULT_TIME_ZONE,
  });

  if (!reminder.isActive) {
    await reminderRepository.activate(reminder.id);
  }

  await scheduleNext(reminder.id);
}

export async function disableRemindersForUser(userId: number) {
  const reminder = await reminderRepository.findByUserId(userId);
  if (!reminder)
    return;

  if (reminder.isActive) {
    await reminderRepository.deactivate(reminder.id);
  }
}

export async function updateReminderTime(userId: number, timeLocal: string) {
  let reminder = await reminderRepository.findByUserId(userId);

  if (reminder) {
    // Update timeLocal for existing reminder
    reminder = await reminderRepository.update(reminder.id, { timeLocal });
  }
  else {
    // Create new reminder with the specified time
    reminder = await reminderRepository.upsertDefault(userId, {
      timeLocal,
      timeZone: DEFAULT_TIME_ZONE,
    });
  }

  if (reminder.isActive) {
    await scheduleNext(reminder.id);
  }
}

export async function isRemindersEnabled(userId: number): Promise<boolean> {
  const reminder = await reminderRepository.findByUserId(userId);
  return Boolean(reminder?.isActive);
}

/**
 * Sync all active reminders with the worker.
 * This should be called when the worker starts to ensure
 * all reminders are scheduled with the correct times from the database.
 */
export async function syncAllReminders(): Promise<void> {
  const activeReminders = await reminderRepository.findAllActive();

  for (const reminder of activeReminders) {
    await scheduleNext(reminder.id);
  }
}

interface ReminderWithSchedule extends Reminder {
  timeLocal: string | null;
  timeZone: string | null;
}
