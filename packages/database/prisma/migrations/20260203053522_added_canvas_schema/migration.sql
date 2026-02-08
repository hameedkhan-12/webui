-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_ownerId_fkey";

-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "styles" JSONB NOT NULL DEFAULT '{}',
    "breakpoints" JSONB NOT NULL DEFAULT '{"mobile":640,"tablet":768,"desktop":1024}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasElement" (
    "id" TEXT NOT NULL,
    "canvasId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "styles" JSONB NOT NULL DEFAULT '{}',
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "responsiveStyles" JSONB DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasChange" (
    "id" TEXT NOT NULL,
    "canvasId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "elementId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementLock" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Canvas_projectId_key" ON "Canvas"("projectId");

-- CreateIndex
CREATE INDEX "Canvas_projectId_idx" ON "Canvas"("projectId");

-- CreateIndex
CREATE INDEX "CanvasElement_canvasId_idx" ON "CanvasElement"("canvasId");

-- CreateIndex
CREATE INDEX "CanvasElement_parentId_idx" ON "CanvasElement"("parentId");

-- CreateIndex
CREATE INDEX "CanvasElement_canvasId_parentId_order_idx" ON "CanvasElement"("canvasId", "parentId", "order");

-- CreateIndex
CREATE INDEX "CanvasElement_createdAt_idx" ON "CanvasElement"("createdAt");

-- CreateIndex
CREATE INDEX "CanvasChange_canvasId_timestamp_idx" ON "CanvasChange"("canvasId", "timestamp");

-- CreateIndex
CREATE INDEX "CanvasChange_userId_idx" ON "CanvasChange"("userId");

-- CreateIndex
CREATE INDEX "CanvasChange_sessionId_idx" ON "CanvasChange"("sessionId");

-- CreateIndex
CREATE INDEX "ElementLock_elementId_idx" ON "ElementLock"("elementId");

-- CreateIndex
CREATE INDEX "ElementLock_userId_idx" ON "ElementLock"("userId");

-- CreateIndex
CREATE INDEX "ElementLock_expiresAt_idx" ON "ElementLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElementLock_elementId_key" ON "ElementLock"("elementId");

-- CreateIndex
CREATE INDEX "ProjectVersion_createdAt_idx" ON "ProjectVersion"("createdAt");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasElement" ADD CONSTRAINT "CanvasElement_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "Canvas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasChange" ADD CONSTRAINT "CanvasChange_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "Canvas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasChange" ADD CONSTRAINT "CanvasChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementLock" ADD CONSTRAINT "ElementLock_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "CanvasElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementLock" ADD CONSTRAINT "ElementLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
