import { getAIProvider } from "./ai";
import { db } from "./db";
import { getProjectKnowledge } from "./project-repository";

export async function createAiJob(input: { projectId: string; userId?: string; prompt: string; artifactId?: string }) {
  return db.aiJob.create({ data: { projectId: input.projectId, requestedById: input.userId, prompt: input.prompt, artifactId: input.artifactId } });
}

export async function getAiJob(projectId: string, jobId: string) {
  return db.aiJob.findFirst({ where: { id: jobId, projectId } });
}

export async function processNextJob(): Promise<boolean> {
  const job = await db.$transaction(async (tx) => {
    const candidate = await tx.aiJob.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
    if (!candidate) return null;
    await tx.aiJob.update({ where: { id: candidate.id }, data: { status: "PROCESSING", startedAt: new Date() } });
    return candidate;
  });
  if (!job) return false;
  try {
    const projectRow = await db.project.findUnique({ where: { id: job.projectId } });
    if (!projectRow) throw new Error("PROJECT_NOT_FOUND");
    const project = await getProjectKnowledge(projectRow.key);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const response = await getAIProvider().complete({ prompt: job.prompt, project, artifactId: job.artifactId ?? undefined });
    await db.aiJob.update({ where: { id: job.id }, data: { status: "COMPLETED", result: response.text, provider: response.provider, model: response.model, completedAt: new Date() } });
  } catch (error) {
    await db.aiJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "unknown", completedAt: new Date() } });
  }
  return true;
}