/*
  Warnings:

  - You are about to drop the column `fine` on the `Borrowing` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('NONE', 'ANALYSIS_TASK');

-- AlterTable
ALTER TABLE "Borrowing" DROP COLUMN "fine",
ADD COLUMN     "penaltyBookId" TEXT,
ADD COLUMN     "penaltyNote" TEXT,
ADD COLUMN     "penaltyType" "PenaltyType" NOT NULL DEFAULT 'NONE';

-- AddForeignKey
ALTER TABLE "Borrowing" ADD CONSTRAINT "Borrowing_penaltyBookId_fkey" FOREIGN KEY ("penaltyBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
