import type { PrismaClientX } from '#root/prisma/index.js';
import type { Prisma, User } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class UserRepository {
  private storage: PrismaClientX;

  constructor(storageClient: PrismaClientX) {
    this.storage = storageClient;
  }

  async findById(id: number): Promise<User | null> {
    return this.storage.user.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: number | undefined): Promise<User | null> {
    return this.storage.user.findUnique({
      where: { telegramId },
    });
  }

  async updateByTelegramId(telegramId: number | undefined, data: Prisma.UserUpdateInput): Promise<User> {
    return this.storage.user.update({
      where: { telegramId },
      data,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.storage.user.create({
      data,
    });
  }
}

export const userRepository = new UserRepository(prisma);
