import { ProjectRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeProjectRequest, hasSameOrigin, integrationTokenIsValid } from "@/lib/auth";
import { getDesignContext, importDesignContext, parseDesignContextInput } from "@/lib/design-context";
import { projectKeySchema } from "@/lib/validation";

const writers = [ProjectRole.OWNER, ProjectRole.EDITOR];

function bearerPresent(request: Request): boolean {
  const header = request.headers.get("authorization");
  return Boolean(header && /^Bearer\s+/.test(header) && integrationTokenIsValid(header.replace(/^Bearer\s+/i, "").trim()));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  if (!projectKey.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  const context = await authorizeProjectRequest(request, projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const design = await getDesignContext(context.projectId);
  return NextResponse.json({ design });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectKey = projectKeySchema.safeParse(body?.projectKey);
  if (!projectKey.success || typeof body?.payload !== "object" || body.payload === null) {
    return NextResponse.json({ error: "A valid project key and design payload are required." }, { status: 400 });
  }
  // Token-authenticated server-to-server calls may come from another origin.
  // Session-authenticated mutations still require a same-origin request (CSRF).
  if (!bearerPresent(request) && !hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const context = await authorizeProjectRequest(request, projectKey.data, writers);
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = parseDesignContextInput(body.payload, body.sourceUrl);
  if (!parsed.isValid) return NextResponse.json({ error: "Payload does not contain recognizable design tokens." }, { status: 422 });
  try {
    const result = await importDesignContext(context, { ctx: parsed.ctx, externalRef: body.sourceUrl, source: body.source === "MANUAL" ? "MANUAL" : "VINYASA" });
    const design = await getDesignContext(context.projectId);
    return NextResponse.json({ result, design }, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ event: "design_context_import_failed", projectId: context.projectId, message: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Unable to import design context." }, { status: 500 });
  }
}