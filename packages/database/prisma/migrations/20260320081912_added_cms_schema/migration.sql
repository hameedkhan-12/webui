-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'RICH_TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'MEDIA', 'SELECT', 'RELATION');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CmsCollection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsEntry" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsMedia" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "folder" TEXT NOT NULL DEFAULT 'cms',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmsCollection_projectId_idx" ON "CmsCollection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsCollection_projectId_slug_key" ON "CmsCollection"("projectId", "slug");

-- CreateIndex
CREATE INDEX "CmsEntry_collectionId_idx" ON "CmsEntry"("collectionId");

-- CreateIndex
CREATE INDEX "CmsEntry_projectId_idx" ON "CmsEntry"("projectId");

-- CreateIndex
CREATE INDEX "CmsEntry_status_idx" ON "CmsEntry"("status");

-- CreateIndex
CREATE INDEX "CmsEntry_collectionId_status_idx" ON "CmsEntry"("collectionId", "status");

-- CreateIndex
CREATE INDEX "CmsMedia_projectId_idx" ON "CmsMedia"("projectId");

-- CreateIndex
CREATE INDEX "CmsMedia_projectId_type_idx" ON "CmsMedia"("projectId", "type");

-- CreateIndex
CREATE INDEX "CmsMedia_createdAt_idx" ON "CmsMedia"("createdAt");

-- AddForeignKey
ALTER TABLE "CmsCollection" ADD CONSTRAINT "CmsCollection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CmsCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsMedia" ADD CONSTRAINT "CmsMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
