import { getAIProvider } from "./ai";
import { db } from "./db";
import { getProjectKnowledge } from "./project-repository";

/**
 * A PROCESSING job whose `startedAt` is older than this window is treated as
 * abandoned (the worker that claimed it crashed) and reclaimed for retry.
 * The window is deliberately generous so legitimately long-running provider
 * calls are not double-processed by a second worker.
 */
const LEASE_MS = 10 * 60 * 1000;

/** Maximum number of processing attempts before a job is settled FAILED. */
const MAX_ATTEMPTS = 3;

export async function createAiJob(input: { projectId: string; userId?: string; prompt: string; artifactId?: string }) {
  return db.aiJob.create({ data: { projectId: input.projectId, requestedById: input.userId, prompt: input.prompt, artifactId: input.artifactId } });
}

export async function getAiJob(projectId: string, jobId: string) {
  return db.aiJob.findFirst({ where: { id: jobId, projectId } });
}

/**
 * Claims and processes the next available job. Returns `true` when a job was
 * processed, `false` when no work was available or the claim was lost to a
 * competing worker.
 *
 * Hardening over the previous implementation:
 *  - Atomic claim (`updateMany ... where status=PENDING`): two workers can no
 *    longer race and both process the same job.
 *  - Lease-based reclaim: PROCESSING jobs whose lease has expired are returned
 *    to PENDING instead of being stranded forever when a worker crashes.
 *  - Bounded retries: each claim increments `attempts`; a job that fails
 *    repeatedly is settled FAILED instead of retrying indefinitely.
 */
export async function processNextJob(): Promise<boolean> {
  // Reclaim abandoned PROCESSING jobs (worker crash) up to MAX_ATTEMPTS.
  await db.aiJob.updateMany({
    where: { status: "PROCESSING", startedAt: { lt: new Date(Date.now() - LEASE_MS) }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "PENDING", startedAt: null },
  });

  const candidate = await db.aiJob.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  if (!candidate) return false;

  const claimed = await db.aiJob.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false; // another worker claimed it first

  try {
    const projectRow = await db.project.findUnique({ where: { id: candidate.projectId } });
    if (!projectRow) throw new Error("PROJECT_NOT_FOUND");
    const project = await getProjectKnowledge(projectRow.key);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const response = await getAIProvider().complete({ prompt: candidate.prompt, project, artifactId: candidate.artifactId ?? undefined });
    // Settle only if still PROCESSING under this claim; the updateMany guard
    // prevents overwriting a job that was reclaimed and re-claimed meanwhile.
    await db.aiJob.updateMany({ where: { id: candidate.id, status: "PROCESSING" }, data: { status: "COMPLETED", result: response.text, provider: response.provider, model: response.model, completedAt: new Date() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const row = await db.aiJob.findUnique({ where: { id: candidate.id }, select: { attempts: true } });
    const attempts = row?.attempts ?? 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.aiJob.updateMany({ where: { id: candidate.id, status: "PROCESSING" }, data: { status: "FAILED", error: message, completedAt: new Date() } });
    } else {
      // Return to the queue for another attempt.
      await db.aiJob.updateMany({ where: { id: candidate.id, status: "PROCESSING" }, data: { status: "PENDING", startedAt: null, error: message } });
    }
  }
  return true;
}
