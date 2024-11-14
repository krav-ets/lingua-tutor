import type { PrismaClientX } from '#root/prisma/index.js';
import type { Prisma, User } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class UserRepository {
  private prisma: PrismaClientX;

  constructor(prismaClient: PrismaClientX) {
    this.prisma = prismaClient;
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: number | undefined): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
}

export const userRepository = new UserRepository(prisma);
