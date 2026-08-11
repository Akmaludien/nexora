import { ArtifactType } from "@prisma/client";
import { getDesignContext } from "./design-context";
import { getProjectKnowledge, type MemberContext } from "./project-repository";

/**
 * Product Intelligence contract exposed to downstream consumers (Vinyasa, and
 * later the Build Pack layer). It is deterministic: the same project yields the
 * identical canonical `project_id` and structured sections.
 *
 * `project_id` is the stable, URL-safe project key Nexora uses as the canonical
 * external identifier across authentication, MCP, and integration boundaries.
 * It is NOT the internal PostgreSQL UUID.
 */
export const PRODUCT_CONTEXT_SCHEMA_VERSION = "1.0";

export async function buildIntegrationContract(context: MemberContext) {
  const knowledge = await getProjectKnowledge(context.projectKey);
  if (!knowledge) return null;

  const byType = (type: ArtifactType) =>
    knowledge.artifacts.filter((a) => a.type === artifactToDomain[type]).map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      version: a.version,
      status: a.status,
      acceptanceCriteria: a.acceptanceCriteria ?? [],
      milestone: a.milestone ?? null,
    }));

  const design = await getDesignContext(context.projectId);

  return {
    schema_version: PRODUCT_CONTEXT_SCHEMA_VERSION,
    project_id: context.projectKey,
    project: {
      key: context.projectKey,
      name: knowledge.name,
      description: knowledge.description,
      complexity: knowledge.complexity,
      completeness: knowledge.completeness,
    },
    product: {
      prd: byType(ArtifactType.PRD),
      requirements: byType(ArtifactType.REQUIREMENT),
      features: byType(ArtifactType.FEATURE),
      userStories: byType(ArtifactType.USER_STORY),
      userFlows: byType(ArtifactType.USER_FLOW),
      businessRules: byType(ArtifactType.BUSINESS_RULE),
      architecture: byType(ArtifactType.ARCHITECTURE),
      decisions: byType(ArtifactType.DECISION),
      api: byType(ArtifactType.API),
      database: byType(ArtifactType.DATABASE),
    },
    relationships: knowledge.relationships,
    design,
  };
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