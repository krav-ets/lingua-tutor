import type { TranslationEntry } from '#root/llm/tasks/translate.js';
import type { Prisma, Word, WordCollection } from '@prisma/client';
import { prisma } from '#root/prisma/index.js';
import { languageRepository } from '#root/repositories/language.repository.js';
import { userRepository } from '#root/repositories/user.repository.js';

const MY_WORDS_TITLE = 'My words';

export interface EnsureMyWordsCollectionParams {
  userId: number;
  languageCode: string; // source language (e.g., "en")
  translationLanguageCode: string; // target language (e.g., "ru")
}

export interface AddTranslatedWordParams extends EnsureMyWordsCollectionParams {
  translation: TranslationEntry;
}

export interface AddTranslatedWordResult {
  collection: WordCollection;
  word: Word;
  isNewCollection: boolean;
  isNewWord: boolean;
}

/**
 * Ensures that a personal collection titled "My words" exists for the user
 * for the given translation direction. If it does not exist, it is created
 * with the user set as the owner.
 */
export async function ensureMyWordsCollection(
  { userId, languageCode, translationLanguageCode }: EnsureMyWordsCollectionParams,
): Promise<{ collection: WordCollection; isNew: boolean }> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const [srcLang, dstLang] = await Promise.all([
    languageRepository.findByCode(languageCode),
    languageRepository.findByCode(translationLanguageCode),
  ]);

  if (!srcLang || !dstLang) {
    throw new Error('LANGUAGE_NOT_FOUND');
  }

  // Try to find an existing collection owned by the user for the language pair (any title)
  const existingOwnedAnyTitle = await prisma.wordCollection.findFirst({
    where: {
      languageCode,
      translationLanguageCode,
      ownerId: userId,
    },
  });

  if (existingOwnedAnyTitle) {
    return { collection: existingOwnedAnyTitle, isNew: false };
  }

  // Create a new collection owned by the user with a user-unique title
  // to avoid collisions with the global unique index on [title, languageCode, translationLanguageCode].
  const titleForUser = `${MY_WORDS_TITLE} [${userId}]`;
  try {
    const created = await prisma.wordCollection.create({
      data: {
        title: titleForUser,
        desc: 'Personal vocabulary',
        language: { connect: { code: languageCode } },
        translationLanguage: { connect: { code: translationLanguageCode } },
        owner: { connect: { id: userId } },
      },
    });
    return { collection: created, isNew: true };
  }
  catch (error: any) {
    // If concurrent creation happened, return the existing one
    if (error?.code !== 'P2002')
      throw error;

    const existing = await prisma.wordCollection.findFirst({
      where: {
        languageCode,
        translationLanguageCode,
        ownerId: userId,
      },
    });
    if (!existing)
      throw error;
    return { collection: existing, isNew: false };
  }
}

/**
 * Adds a translated word to the user's "My words" collection for the given
 * direction. Creates the collection if needed, de-duplicates words inside
 * the collection by (word, translation) pair, and ensures a WordProgress
 * entry exists for the user.
 */
export async function addTranslatedWordForUser(
  params: AddTranslatedWordParams,
): Promise<AddTranslatedWordResult> {
  const { userId, languageCode, translationLanguageCode, translation } = params;

  return prisma.$transaction(async (tx) => {
    // Ensure collection
    const ensured = await ensureMyWordsCollection({ userId, languageCode, translationLanguageCode });
    const collection = ensured.collection;

    // Try find existing word in this collection (by word + translation)
    let word = await tx.word.findFirst({
      where: {
        wordCollectionId: collection.id,
        word: translation.word,
        translation: translation.translation,
      },
    });

    let isNewWord = false;
    if (!word) {
      const info: Prisma.InputJsonValue = {
        pos: translation.pos ?? null,
        def: translation.def,
        examples: translation.examples,
        meta: {
          languageCode,
          translationLanguageCode,
        },
      };

      word = await tx.word.create({
        data: {
          word: translation.word,
          translation: translation.translation,
          transcription: translation.transcription ?? null,
          info,
          wordCollection: { connect: { id: collection.id } },
        },
      });
      isNewWord = true;
    }

    // Ensure WordProgress exists for the user and this word
    await tx.wordProgress.upsert({
      where: { userId_wordId: { userId, wordId: word.id } },
      update: {},
      create: {
        userId,
        wordId: word.id,
        status: 'todo',
      },
    });

    return {
      collection,
      word,
      isNewCollection: ensured.isNew,
      isNewWord,
    };
  });
}
