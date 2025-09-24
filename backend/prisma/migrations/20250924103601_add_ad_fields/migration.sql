-- AlterTable
ALTER TABLE "public"."Ad" ADD COLUMN     "imageKeys" JSONB,
ALTER COLUMN "category" SET DEFAULT 'OTROS';
