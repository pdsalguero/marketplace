-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."AdImage" (
    "id" SERIAL NOT NULL,
    "adId" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,

    CONSTRAINT "AdImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AdImage" ADD CONSTRAINT "AdImage_adId_fkey" FOREIGN KEY ("adId") REFERENCES "public"."Ad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
