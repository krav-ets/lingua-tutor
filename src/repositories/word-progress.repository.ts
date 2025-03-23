import type { PrismaClientX } from '#root/prisma/index.js';
import type { Prisma, User, Word, WordProgress } from '@prisma/client';
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

  async getTodayCount(userId: number): Promise<number> {
    // today start (00:00:00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // today end (23:59:59)
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // count words
    const count = await this.storage.wordProgress.count({
      where: {
        userId,
        startedAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    return count;
  }

  async findNextWordToStudy(userId: number): Promise<Word | null> {
    const progress = await this.storage.wordProgress.findFirst({
      where: {
        userId,
        status: 'todo',
      },
      include: { word: true },
    });

    return progress?.word ?? null;
  }

  async findWordToRepeat(userId: number): Promise<Word | null> {
    const word = await this.storage.wordProgress.findFirst({
      where: {
        userId,
        status: 'inProgress',
        nextReviewAt: { lte: new Date() },
      },
      include: { word: true },
    });

    return word?.word ?? null;
  }

  async updateStatus(userId: number, wordId: number, status: string): Promise<WordProgress> {
    return this.storage.wordProgress.update({
      where: { userId_wordId: { userId, wordId } },
      data: {
        status,
        ...(status === 'inProgress' && { startedAt: new Date() }),
      },
    });
  }

  async countByUserAndStatus(userId: number, status: string): Promise<number> {
    return this.storage.wordProgress.count({
      where: {
        userId,
        status,
      },
    });
  }

  async findWordsToRepeat(userId: number): Promise<Array<any>> {
    const now = new Date();

    const wordsToRepeat = await this.storage.wordProgress.findMany({
      where: {
        userId,
        status: 'inProgress',
        nextReviewAt: { lte: now },
      },
      include: { word: true },
    });

    return wordsToRepeat;
  }

  async findByUserAndWord(userId: number, wordId: number): Promise<any | null> {
    return this.storage.wordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
  }

  async update(userId: number, wordId: number, data: any): Promise<any> {
    return this.storage.wordProgress.update({
      where: { userId_wordId: { userId, wordId } },
      data,
    });
  }
}

export const wordProgressRepository = new WordProgressRepository(prisma);
