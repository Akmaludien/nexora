import { NextResponse } from "next/server";
import { authorizeProject, hasSameOrigin } from "@/lib/auth";
import { getDesignContext } from "@/lib/design-context";
import { executeMcpTool } from "@/lib/mcp";
import { getProjectKnowledge, incrementRateLimit } from "@/lib/project-repository";
import { mcpSchema, projectKeySchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = mcpSchema.safeParse(body);
  const projectKey = projectKeySchema.safeParse(body?.projectKey);
  if (!parsed.success || !projectKey.success) return NextResponse.json({ error: "Invalid MCP request" }, { status: 400 });
  const context = await authorizeProject(projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limit = await incrementRateLimit({ subject: context.userId, action: "mcp", projectId: context.projectId, limit: 60, windowSeconds: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "MCP rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (parsed.data.tool === "get_design_context") {
    const design = await getDesignContext(context.projectId);
    return NextResponse.json({ content: design });
  }
  const project = await getProjectKnowledge(context.projectKey);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ content: executeMcpTool(project, parsed.data.tool, parsed.data.arguments) });
}