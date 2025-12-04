import type { Prisma } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class ReminderRepository {
  findById(id: number) {
    return prisma.reminder.findUnique({ where: { id } });
  }

  findByUserId(userId: number) {
    return prisma.reminder.findFirst({ where: { userId } });
  }

  async upsertDefault(userId: number, defaults?: ReminderDefaults) {
    const existing = await this.findByUserId(userId);
    if (existing)
      return existing;
    return prisma.reminder.create({
      data: {
        user: { connect: { id: userId } },
        isActive: true,
        time: new Date(), // will set real runAt via service
        timeLocal: defaults?.timeLocal ?? '13:00',
        timeZone: defaults?.timeZone ?? 'UTC',
      },
    });
  }

  activate(id: number) {
    return prisma.reminder.update({ where: { id }, data: { isActive: true } });
  }

  deactivate(id: number) {
    return prisma.reminder.update({ where: { id }, data: { isActive: false } });
  }

  setNextRunAt(id: number, nextRunAtUtc: Date) {
    return prisma.reminder.update({ where: { id }, data: { time: nextRunAtUtc } });
  }

  update(id: number, data: Prisma.ReminderUpdateInput) {
    return prisma.reminder.update({ where: { id }, data });
  }
}

export const reminderRepository = new ReminderRepository();

interface ReminderDefaults {
  timeLocal?: string | null;
  timeZone?: string | null;
}
