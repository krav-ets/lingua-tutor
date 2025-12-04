/*
  Warnings:

  - A unique constraint covering the columns `[title,languageCode,translationLanguageCode]` on the table `WordCollection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "wordsPerDay" SET DEFAULT 7;

-- AlterTable
ALTER TABLE "WordProgress" ALTER COLUMN "interval" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "_UserSelectedCollections" ADD CONSTRAINT "_UserSelectedCollections_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserSelectedCollections_AB_unique";

-- CreateIndex
CREATE UNIQUE INDEX "WordCollection_title_languageCode_translationLanguageCode_key" ON "WordCollection"("title", "languageCode", "translationLanguageCode");
