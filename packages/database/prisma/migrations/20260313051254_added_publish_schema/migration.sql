/*
  Warnings:

  - A unique constraint covering the columns `[publishSlug]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('IDLE', 'BUNDLING', 'UPLOADING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishTrigger" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "lastPublishId" TEXT,
ADD COLUMN     "publishSlug" TEXT,
ADD COLUMN     "publishedUrl" TEXT;

-- CreateTable
CREATE TABLE "PublishRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "framework" TEXT NOT NULL,
    "trigger" "PublishTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "PublishStatus" NOT NULL DEFAULT 'IDLE',
    "buildTime" INTEGER,
    "totalSize" BIGINT,
    "fileCount" INTEGER,
    "errorMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublishRecord_projectId_idx" ON "PublishRecord"("projectId");

-- CreateIndex
CREATE INDEX "PublishRecord_projectId_status_idx" ON "PublishRecord"("projectId", "status");

-- CreateIndex
CREATE INDEX "PublishRecord_publishedBy_idx" ON "PublishRecord"("publishedBy");

-- CreateIndex
CREATE INDEX "PublishRecord_projectSlug_idx" ON "PublishRecord"("projectSlug");

-- CreateIndex
CREATE INDEX "PublishRecord_createdAt_idx" ON "PublishRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublishRecord_projectId_version_key" ON "PublishRecord"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publishSlug_key" ON "Project"("publishSlug");

-- CreateIndex
CREATE INDEX "Project_publishSlug_idx" ON "Project"("publishSlug");

-- AddForeignKey
ALTER TABLE "PublishRecord" ADD CONSTRAINT "PublishRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishRecord" ADD CONSTRAINT "PublishRecord_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
