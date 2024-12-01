/*
  Warnings:

  - You are about to drop the column `browserId` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `expertId` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivity` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `problemResolved` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chats` table. All the data in the column will be lost.
  - Added the required column `browser_id` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expert_id` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_activity` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `chats` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "chats_browserId_idx";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "browserId",
DROP COLUMN "createdAt",
DROP COLUMN "expertId",
DROP COLUMN "lastActivity",
DROP COLUMN "problemResolved",
DROP COLUMN "updatedAt",
ADD COLUMN     "browser_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expert_id" TEXT NOT NULL,
ADD COLUMN     "last_activity" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "problem_resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "chats_browser_id_idx" ON "chats"("browser_id");
