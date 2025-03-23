import type { Word, WordProgress } from '@prisma/client';
import { userRepository } from '#root/repositories/user.repository.js';
import { wordProgressRepository } from '#root/repositories/word-progress.repository.js';
import calcSm from '#root/utils/sm-2.js';

interface ReviewWordParams {
  userId: number;
  wordId: number;
  quality: number;
}
export async function getNextWordToStudy(userId: number): Promise<Word | null> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  const todayCount = await wordProgressRepository.getTodayCount(userId);

  if (todayCount >= user.wordsPerDay) {
    return null;
  }

  return wordProgressRepository.findNextWordToStudy(userId);
}

export async function getNextWordToRepeat(userId: number): Promise<Word | null> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return wordProgressRepository.findNextWordToStudy(userId);
}

export async function reviewWord({ userId, wordId, quality }: ReviewWordParams): Promise<WordProgress> {
  const progress = await wordProgressRepository.findByUserAndWord(userId, wordId);

  if (!progress) {
    throw new Error('PROGRESS_NOT_FOUND');
  }

  const smResult = calcSm({
    quality,
    repetitions: progress.repetitions,
    previousInterval: progress.interval,
    previousEaseFactor: progress.easeFactor,
  });

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + smResult.interval);

  return wordProgressRepository.update(userId, wordId, {
    quality,
    status: 'inProgress',
    interval: smResult.interval,
    repetitions: smResult.repetitions,
    easeFactor: smResult.easeFactor,
    lastReviewedAt: new Date(),
    nextReviewAt,
  });
}
