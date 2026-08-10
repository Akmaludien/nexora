-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectComplexity" AS ENUM ('SIMPLE', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('PRD', 'REQUIREMENT', 'FEATURE', 'USER_STORY', 'BUSINESS_RULE', 'USER_FLOW', 'API', 'DATABASE', 'ARCHITECTURE', 'SECURITY', 'TESTING', 'ROADMAP', 'TASK', 'DECISION', 'DESIGN_CONTEXT');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('DRAFT', 'REVIEW', 'VALIDATED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('DEPENDS_ON', 'IMPLEMENTS', 'AFFECTS', 'REQUIRES', 'MAPS_TO', 'VALIDATES', 'DERIVED_FROM');

-- CreateEnum
CREATE TYPE "MutationKind" AS ENUM ('CREATE', 'UPDATE', 'RESTORE', 'IMPACT_APPLY', 'DELETE');

-- CreateEnum
CREATE TYPE "ImpactStatus" AS ENUM ('REVIEW', 'APPLIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('ANSWERED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ExportTarget" AS ENUM ('OPENCODE', 'CLAUDE', 'CODEX', 'SPEC_KIT', 'GENERIC');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(120),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "complexity" "ProjectComplexity" NOT NULL DEFAULT 'SIMPLE',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactVersion" (
    "id" UUID NOT NULL,
    "artifactId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "content" TEXT NOT NULL,
    "changeNote" TEXT,
    "metadata" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactRelationship" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sourceArtifactId" UUID NOT NULL,
    "targetArtifactId" UUID NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ArtifactRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutationRecord" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "artifactId" UUID,
    "actorId" UUID,
    "kind" "MutationKind" NOT NULL,
    "fromVersion" INTEGER,
    "toVersion" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactAnalysis" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sourceArtifactId" UUID NOT NULL,
    "requestedById" UUID,
    "status" "ImpactStatus" NOT NULL DEFAULT 'REVIEW',
    "summary" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ImpactAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactItem" (
    "id" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "artifactId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "proposedContent" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryAnswer" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "value" TEXT,
    "status" "DiscoveryStatus" NOT NULL,
    "answeredById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DiscoveryAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitWindow" (
    "id" UUID NOT NULL,
    "projectId" UUID,
    "subject" VARCHAR(160) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExport" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requestedById" UUID,
    "target" "ExportTarget" NOT NULL,
    "artifactCount" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_expiresAt_idx" ON "Session"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_role_idx" ON "ProjectMember"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Artifact_projectId_type_status_idx" ON "Artifact"("projectId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_projectId_key_key" ON "Artifact"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_id_projectId_key" ON "Artifact"("id", "projectId");

-- CreateIndex
CREATE INDEX "ArtifactVersion_artifactId_createdAt_idx" ON "ArtifactVersion"("artifactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactVersion_artifactId_version_key" ON "ArtifactVersion"("artifactId", "version");

-- CreateIndex
CREATE INDEX "ArtifactRelationship_projectId_sourceArtifactId_type_idx" ON "ArtifactRelationship"("projectId", "sourceArtifactId", "type");

-- CreateIndex
CREATE INDEX "ArtifactRelationship_projectId_targetArtifactId_type_idx" ON "ArtifactRelationship"("projectId", "targetArtifactId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactRelationship_projectId_sourceArtifactId_targetArtif_key" ON "ArtifactRelationship"("projectId", "sourceArtifactId", "targetArtifactId", "type");

-- CreateIndex
CREATE INDEX "MutationRecord_projectId_createdAt_idx" ON "MutationRecord"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "MutationRecord_artifactId_createdAt_idx" ON "MutationRecord"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "ImpactAnalysis_projectId_status_createdAt_idx" ON "ImpactAnalysis"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImpactItem_analysisId_reviewStatus_idx" ON "ImpactItem"("analysisId", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactItem_analysisId_artifactId_key" ON "ImpactItem"("analysisId", "artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryAnswer_projectId_category_key" ON "DiscoveryAnswer"("projectId", "category");

-- CreateIndex
CREATE INDEX "RateLimitWindow_expiresAt_idx" ON "RateLimitWindow"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitWindow_subject_action_windowStart_key" ON "RateLimitWindow"("subject", "action", "windowStart");

-- CreateIndex
CREATE INDEX "ProjectExport_projectId_createdAt_idx" ON "ProjectExport"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactVersion" ADD CONSTRAINT "ArtifactVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRelationship" ADD CONSTRAINT "ArtifactRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRelationship" ADD CONSTRAINT "ArtifactRelationship_sourceArtifactId_projectId_fkey" FOREIGN KEY ("sourceArtifactId", "projectId") REFERENCES "Artifact"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRelationship" ADD CONSTRAINT "ArtifactRelationship_targetArtifactId_projectId_fkey" FOREIGN KEY ("targetArtifactId", "projectId") REFERENCES "Artifact"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutationRecord" ADD CONSTRAINT "MutationRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutationRecord" ADD CONSTRAINT "MutationRecord_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutationRecord" ADD CONSTRAINT "MutationRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactAnalysis" ADD CONSTRAINT "ImpactAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactAnalysis" ADD CONSTRAINT "ImpactAnalysis_sourceArtifactId_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactAnalysis" ADD CONSTRAINT "ImpactAnalysis_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactItem" ADD CONSTRAINT "ImpactItem_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ImpactAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactItem" ADD CONSTRAINT "ImpactItem_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactItem" ADD CONSTRAINT "ImpactItem_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryAnswer" ADD CONSTRAINT "DiscoveryAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryAnswer" ADD CONSTRAINT "DiscoveryAnswer_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitWindow" ADD CONSTRAINT "RateLimitWindow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExport" ADD CONSTRAINT "ProjectExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExport" ADD CONSTRAINT "ProjectExport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
