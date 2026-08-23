/*
  Warnings:

  - You are about to drop the column `penaltyBookId` on the `Borrowing` table. All the data in the column will be lost.
  - You are about to drop the column `penaltyNote` on the `Borrowing` table. All the data in the column will be lost.
  - You are about to drop the column `penaltyType` on the `Borrowing` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Borrowing" DROP CONSTRAINT "Borrowing_penaltyBookId_fkey";

-- AlterTable
ALTER TABLE "Borrowing" DROP COLUMN "penaltyBookId",
DROP COLUMN "penaltyNote",
DROP COLUMN "penaltyType",
ADD COLUMN     "fine" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "PenaltyType";
