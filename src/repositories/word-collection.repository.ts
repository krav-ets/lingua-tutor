import type { PrismaClientX } from '#root/prisma/index.js';
import type { Prisma, WordCollection } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class WordCollectionRepository {
  private storage: PrismaClientX;

  constructor(storageClient: PrismaClientX) {
    this.storage = storageClient;
  }

  async findById(id: number): Promise<WordCollection | null> {
    return this.storage.wordCollection.findUnique({
      where: { id },
    });
  }

  async findByOwner(id: number | undefined): Promise<WordCollection[] | null> {
    return this.storage.wordCollection.findMany({
      where: { ownerId: id },
    });
  }

  async findByLanguages(
    langs: { language?: string | null; translationLanguage?: string | null },
    userId?: number,
  ): Promise<WordCollection[] | null> {
    const { language, translationLanguage } = langs;

    return this.storage.wordCollection.findMany({
      where: {
        ...(language && { languageCode: language }),
        ...(translationLanguage && { translationLanguageCode: translationLanguage }),
        ...(userId && {
          OR: [
            { ownerId: userId }, // Collections owned by the user
            { selectedByUsers: { some: { id: userId } } }, // Collections selected by the user
          ],
        }),
      },
    });
  }

  async findAll(): Promise<WordCollection[] | null> {
    return this.storage.wordCollection.findMany({});
  }

  async create(data: Prisma.WordCollectionCreateInput): Promise<WordCollection> {
    return this.storage.wordCollection.create({
      data,
    });
  }
}

export const wordCollectionRepository = new WordCollectionRepository(prisma);
