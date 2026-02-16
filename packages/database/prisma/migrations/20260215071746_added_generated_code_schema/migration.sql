/*
  Warnings:

  - Made the column `responsiveStyles` on table `CanvasElement` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CodeGenStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "CanvasElement" ALTER COLUMN "responsiveStyles" SET NOT NULL;

-- CreateTable
CREATE TABLE "GeneratedCode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "status" "CodeGenStatus" NOT NULL DEFAULT 'PENDING',
    "files" JSONB NOT NULL DEFAULT '[]',
    "dependencies" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedCode_projectId_idx" ON "GeneratedCode"("projectId");

-- CreateIndex
CREATE INDEX "GeneratedCode_status_idx" ON "GeneratedCode"("status");

-- CreateIndex
CREATE INDEX "GeneratedCode_createdAt_idx" ON "GeneratedCode"("createdAt");

-- CreateIndex
CREATE INDEX "AIGenerationJob_createdAt_idx" ON "AIGenerationJob"("createdAt");

-- AddForeignKey
ALTER TABLE "GeneratedCode" ADD CONSTRAINT "GeneratedCode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
