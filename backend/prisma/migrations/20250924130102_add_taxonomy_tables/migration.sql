-- AlterTable
ALTER TABLE "public"."Ad" ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "subcategory" VARCHAR(64),
ADD COLUMN     "subcategoryId" INTEGER;

-- CreateTable
CREATE TABLE "public"."CategoryNode" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoryNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryNode_key_key" ON "public"."CategoryNode"("key");

-- CreateIndex
CREATE INDEX "CategoryNode_parentId_idx" ON "public"."CategoryNode"("parentId");

-- CreateIndex
CREATE INDEX "CategoryNode_key_idx" ON "public"."CategoryNode"("key");

-- CreateIndex
CREATE INDEX "Ad_categoryId_idx" ON "public"."Ad"("categoryId");

-- CreateIndex
CREATE INDEX "Ad_subcategoryId_idx" ON "public"."Ad"("subcategoryId");

-- AddForeignKey
ALTER TABLE "public"."CategoryNode" ADD CONSTRAINT "CategoryNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."CategoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ad" ADD CONSTRAINT "Ad_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ad" ADD CONSTRAINT "Ad_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."CategoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
