import { userRepository } from '#root/repositories/user.repository.js';
import { wordRepository } from '#root/repositories/word.repository.js';
import { wordProgressRepository } from '#root/repositories/word-progress.repository.js';

export async function addCollectionToUser(userId: number, collectionId: number): Promise<void> {
  // add collection to user
  await userRepository.update(userId, {
    selectedCollections: {
      connect: { id: collectionId },
    },
  });

  // get all word ids in collection
  const wordIds = await wordRepository.findIdsByCollectionId(collectionId);

  // create word progress for each word
  if (wordIds && wordIds.length > 0) {
    const wordProgressData = wordIds.map(wordId => ({ userId, wordId, status: 'todo' }));
    await wordProgressRepository.createMany(wordProgressData);
    await wordProgressRepository.updateManyByUser(userId, wordIds, { status: 'todo' });
  }
}

export async function removeCollectionFromUser(userId: number, collectionId: number) {
  // remove collection from user
  await userRepository.update(userId, {
    selectedCollections: {
      disconnect: { id: collectionId },
    },
  });

  // get all word ids in collection
  const wordIds = await wordRepository.findIdsByCollectionId(collectionId);

  // update statuses for selected word ids
  if (wordIds && wordIds.length > 0) {
    await wordProgressRepository.updateManyByUser(userId, wordIds, { status: 'pause' });
  }
}
