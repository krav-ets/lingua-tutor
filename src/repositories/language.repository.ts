import type { PrismaClientX } from '#root/prisma/index.js';
import type { Language, Prisma } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';

class LanguageRepository {
  private storage: PrismaClientX;

  constructor(storageClient: PrismaClientX) {
    this.storage = storageClient;
  }

  async findByCode(code: string): Promise<Language | null> {
    return this.storage.language.findUnique({
      where: { code },
    });
  }

  async findAll(): Promise<Language[] | null> {
    return this.storage.language.findMany({});
  }

  async create(data: Prisma.LanguageCreateInput): Promise<Language> {
    return this.storage.language.create({
      data,
    });
  }
}

export const languageRepository = new LanguageRepository(prisma);
