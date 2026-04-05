-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('LANDING_PAGE', 'PORTFOLIO', 'BLOG', 'ECOMMERCE', 'DASHBOARD', 'SAAS', 'AGENCY', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TemplateFramework" AS ENUM ('REACT', 'VUE', 'SVELTE', 'NEXT');

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "framework" "TemplateFramework" NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "demoUrl" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "dependencies" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "usedBy" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_framework_idx" ON "Template"("framework");

-- CreateIndex
CREATE INDEX "Template_isPremium_idx" ON "Template"("isPremium");

-- CreateIndex
CREATE INDEX "Template_usageCount_idx" ON "Template"("usageCount");

-- CreateIndex
CREATE INDEX "Template_createdAt_idx" ON "Template"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectTemplate_projectId_idx" ON "ProjectTemplate"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_templateId_idx" ON "ProjectTemplate"("templateId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_usedAt_idx" ON "ProjectTemplate"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_projectId_templateId_key" ON "ProjectTemplate"("projectId", "templateId");

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
