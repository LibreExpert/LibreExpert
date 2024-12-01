/*
  Warnings:

  - You are about to drop the column `created_at` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `expert_id` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `last_activity` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `problem_resolved` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `chats` table. All the data in the column will be lost.
  - Added the required column `browserId` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expertId` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastActivity` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `chats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chats" DROP COLUMN "created_at",
DROP COLUMN "expert_id",
DROP COLUMN "last_activity",
DROP COLUMN "problem_resolved",
DROP COLUMN "updated_at",
ADD COLUMN     "browserId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expertId" TEXT NOT NULL,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "problemResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "chats_browserId_idx" ON "chats"("browserId");
