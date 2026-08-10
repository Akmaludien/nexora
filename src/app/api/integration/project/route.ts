import { NextResponse } from "next/server";
import { ArtifactType } from "@prisma/client";
import { authorizeProjectRequest } from "@/lib/auth";
import { getDesignContext } from "@/lib/design-context";
import { getProjectKnowledge } from "@/lib/project-repository";
import { projectKeySchema } from "@/lib/validation";

/**
 * Read-only product-context endpoint for the Vinyasa integration.
 *
 * Returns the project identity, its artifacts (grouped by type so Vinyasa can
 * derive product pages / features / requirements), relationships, and the last
 * synchronized design context — in a single round trip. Authenticated by either
 * a browser session or the shared server-to-server integration token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  if (!projectKey.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });

  const context = await authorizeProjectRequest(request, projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const knowledge = await getProjectKnowledge(context.projectKey);
  if (!knowledge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const byType = (type: ArtifactType) =>
    knowledge.artifacts.filter((a) => a.type === artifactToDomain[type]).map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      version: a.version,
      status: a.status,
    }));

  const design = await getDesignContext(context.projectId);

  return NextResponse.json({
    project: {
      key: context.projectKey,
      name: knowledge.name,
      description: knowledge.description,
      complexity: knowledge.complexity,
      completeness: knowledge.completeness,
    },
    productContext: {
      prd: byType(ArtifactType.PRD),
      requirements: byType(ArtifactType.REQUIREMENT),
      features: byType(ArtifactType.FEATURE),
      userStories: byType(ArtifactType.USER_STORY),
      userFlows: byType(ArtifactType.USER_FLOW),
      architecture: byType(ArtifactType.ARCHITECTURE),
      decisions: byType(ArtifactType.DECISION),
      api: byType(ArtifactType.API),
      database: byType(ArtifactType.DATABASE),
    },
    relationships: knowledge.relationships,
    design,
  });
}

const artifactToDomain: Record<ArtifactType, string> = {
  PRD: "prd",
  REQUIREMENT: "requirement",
  FEATURE: "feature",
  USER_STORY: "user-story",
  BUSINESS_RULE: "business-rule",
  USER_FLOW: "user-flow",
  API: "api",
  DATABASE: "database",
  ARCHITECTURE: "architecture",
  SECURITY: "security",
  TESTING: "testing",
  ROADMAP: "roadmap",
  TASK: "task",
  DECISION: "decision",
  DESIGN_CONTEXT: "design-context",
};