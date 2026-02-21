-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('ANALYSIS_TASK', 'FINE');

-- AlterTable
ALTER TABLE "Borrowing" ADD COLUMN     "penaltyBookId" TEXT,
ADD COLUMN     "penaltyNote" TEXT,
ADD COLUMN     "penaltyType" "PenaltyType";
