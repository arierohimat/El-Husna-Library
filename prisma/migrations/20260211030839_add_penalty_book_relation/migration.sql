-- DropIndex
DROP INDEX "Borrowing_status_idx";

-- CreateIndex
CREATE INDEX "Borrowing_penaltyBookId_idx" ON "Borrowing"("penaltyBookId");

-- AddForeignKey
ALTER TABLE "Borrowing" ADD CONSTRAINT "Borrowing_penaltyBookId_fkey" FOREIGN KEY ("penaltyBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
