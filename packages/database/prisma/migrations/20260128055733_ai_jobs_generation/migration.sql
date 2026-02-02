-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AIGenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "prompt" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "jobType" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIGenerationJob_userId_idx" ON "AIGenerationJob"("userId");

-- CreateIndex
CREATE INDEX "AIGenerationJob_projectId_idx" ON "AIGenerationJob"("projectId");

-- CreateIndex
CREATE INDEX "AIGenerationJob_status_idx" ON "AIGenerationJob"("status");

-- CreateIndex
CREATE INDEX "AIGenerationJob_jobType_idx" ON "AIGenerationJob"("jobType");

-- AddForeignKey
ALTER TABLE "AIGenerationJob" ADD CONSTRAINT "AIGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGenerationJob" ADD CONSTRAINT "AIGenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
