-- CreateTable
CREATE TABLE "_UserSelectedCollections" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserSelectedCollections_AB_unique" ON "_UserSelectedCollections"("A", "B");

-- CreateIndex
CREATE INDEX "_UserSelectedCollections_B_index" ON "_UserSelectedCollections"("B");

-- AddForeignKey
ALTER TABLE "_UserSelectedCollections" ADD CONSTRAINT "_UserSelectedCollections_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSelectedCollections" ADD CONSTRAINT "_UserSelectedCollections_B_fkey" FOREIGN KEY ("B") REFERENCES "WordCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
