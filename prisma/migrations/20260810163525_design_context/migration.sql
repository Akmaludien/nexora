-- CreateEnum
CREATE TYPE "DesignSource" AS ENUM ('VINYASA', 'MANUAL');

-- CreateTable
CREATE TABLE "DesignContext" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "artifactId" UUID NOT NULL,
    "source" "DesignSource" NOT NULL DEFAULT 'VINYASA',
    "externalRef" TEXT,
    "sourceVersion" VARCHAR(100),
    "checksum" VARCHAR(64),
    "payload" JSONB,
    "synchronizedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DesignContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesignContext_artifactId_key" ON "DesignContext"("artifactId");

-- CreateIndex
CREATE INDEX "DesignContext_projectId_source_synchronizedAt_idx" ON "DesignContext"("projectId", "source", "synchronizedAt");

-- AddForeignKey
ALTER TABLE "DesignContext" ADD CONSTRAINT "DesignContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignContext" ADD CONSTRAINT "DesignContext_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
