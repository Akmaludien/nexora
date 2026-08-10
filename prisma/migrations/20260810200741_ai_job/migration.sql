-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AiJob" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requestedById" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "artifactId" VARCHAR(64),
    "provider" VARCHAR(80),
    "model" VARCHAR(160),
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiJob_status_createdAt_idx" ON "AiJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiJob_projectId_createdAt_idx" ON "AiJob"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
