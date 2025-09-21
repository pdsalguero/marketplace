/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Ad` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Ad" DROP COLUMN "imageUrl",
ADD COLUMN     "imageKey" TEXT;
