import type { PrismaClientX } from '#root/prisma/index.js';
import type { Word } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class WordRepository {
  private storage: PrismaClientX;

  constructor(storageClient: PrismaClientX) {
    this.storage = storageClient;
  }

  async findIdsByCollectionId(collectionId: number | undefined): Promise<Array<Word['id']> | null> {
    const words = await this.storage.word.findMany({
      where: { wordCollectionId: collectionId },
      select: { id: true },
    });

    return words.map(word => word.id);
  }
}

export const wordRepository = new WordRepository(prisma);
