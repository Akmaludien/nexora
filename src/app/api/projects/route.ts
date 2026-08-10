import { NextResponse } from "next/server";
import { getCurrentSession, hasSameOrigin } from "@/lib/auth";
import { createProjectWithOwner } from "@/lib/project-repository";
import { createProjectSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Project name is required (2+ characters)." }, { status: 400 });
  try {
    const created = await createProjectWithOwner(session.userId, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ event: "project_creation_failed", userId: session.userId, message: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}