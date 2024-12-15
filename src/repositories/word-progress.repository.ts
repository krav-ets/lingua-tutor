import type { PrismaClientX } from '#root/prisma/index.js';
import type { Prisma, User, Word } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class WordProgressRepository {
  private storage: PrismaClientX;

  constructor(storageClient: PrismaClientX) {
    this.storage = storageClient;
  }

  async createMany(data: Prisma.WordProgressCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return this.storage.wordProgress.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async updateManyByUser(
    userId: User['id'],
    wordIds: Array<Word['id']>,
    data: Prisma.WordProgressUpdateInput,
  ): Promise<Prisma.BatchPayload> {
    return this.storage.wordProgress.updateMany({
      where: {
        userId,
        wordId: { in: wordIds },
      },
      data,
    });
  }
}

export const wordProgressRepository = new WordProgressRepository(prisma);
