import { NextResponse } from "next/server";
import { authorizeProject, hasSameOrigin } from "@/lib/auth";
import { createAiJob, getAiJob } from "@/lib/ai-job";
import { incrementRateLimit } from "@/lib/project-repository";
import { aiJobSchema, projectKeySchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = aiJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid prompt." }, { status: 400 });
  const context = await authorizeProject(parsed.data.projectKey);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limit = await incrementRateLimit({ subject: context.userId, action: "ai:job", projectId: context.projectId, limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: "AI job rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const job = await createAiJob({ projectId: context.projectId, userId: context.userId, prompt: parsed.data.prompt, artifactId: parsed.data.artifactId });
  return NextResponse.json({ id: job.id, status: job.status }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  const id = url.searchParams.get("id");
  if (!projectKey.success || !id) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const context = await authorizeProject(projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await getAiJob(context.projectId, id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  return NextResponse.json({ id: job.id, status: job.status, result: job.result, error: job.error, provider: job.provider, model: job.model, createdAt: job.createdAt, completedAt: job.completedAt });
}