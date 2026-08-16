import type { Artifact, ArtifactType, Complexity, HealthReport, Project } from "./types";

const requiredByComplexity: Record<Complexity, ArtifactType[]> = {
  SIMPLE: ["prd", "requirement", "task"],
  SMALL: ["prd", "requirement", "feature", "task", "testing"],
  MEDIUM: ["prd", "requirement", "feature", "user-story", "user-flow", "database", "api", "architecture", "task", "testing"],
  LARGE: ["prd", "requirement", "feature", "user-story", "user-flow", "business-rule", "database", "api", "architecture", "security", "testing", "roadmap", "task"],
  ENTERPRISE: ["prd", "requirement", "feature", "user-story", "user-flow", "business-rule", "database", "api", "architecture", "security", "testing", "roadmap", "task", "decision", "design-context"],
};

export function classifyComplexity(input: { roles: number; features: number; integrations: number; regulated?: boolean; expectedUsers?: number }): Complexity {
  const score = input.roles + input.features + input.integrations * 2 + (input.regulated ? 8 : 0) + ((input.expectedUsers ?? 0) > 100_000 ? 5 : 0);
  if (score <= 5) return "SIMPLE";
  if (score <= 10) return "SMALL";
  if (score <= 20) return "MEDIUM";
  if (score <= 32) return "LARGE";
  return "ENTERPRISE";
}

export function calculateHealth(project: Project): HealthReport {
  const issues: HealthReport["issues"] = [];
  const required = requiredByComplexity[project.complexity];
  const present = new Set(project.artifacts.map((artifact) => artifact.type));
  for (const type of required) {
    if (!present.has(type)) issues.push({ id: `missing-${type}`, severity: "critical", artifactId: type, message: `Required ${type} artifact is missing.` });
  }
  const linked = new Set(project.relationships.flatMap((edge) => [edge.sourceId, edge.targetId]));
  for (const artifact of project.artifacts) {
    if (artifact.type !== "prd" && !linked.has(artifact.id)) issues.push({ id: `orphan-${artifact.id}`, severity: "critical", artifactId: artifact.id, message: `${artifact.id} is not connected to project knowledge.` });
    if (artifact.type === "requirement" && !artifact.acceptanceCriteria?.length) issues.push({ id: `criteria-${artifact.id}`, severity: "warning", artifactId: artifact.id, message: `${artifact.id} has no acceptance criteria.` });
    if (artifact.type === "feature" && !artifact.milestone) issues.push({ id: `milestone-${artifact.id}`, severity: "info", artifactId: artifact.id, message: `${artifact.id} has no assigned milestone.` });
  }
  const requirements = project.artifacts.filter((a) => a.type === "requirement");
  const testedRequirements = new Set(project.relationships.filter((edge) => edge.type === "validates").flatMap((edge) => {
    const source = project.artifacts.find((artifact) => artifact.id === edge.sourceId);
    const target = project.artifacts.find((artifact) => artifact.id === edge.targetId);
    if (source?.type === "requirement" && target?.type === "testing") return [source.id];
    if (target?.type === "requirement" && source?.type === "testing") return [target.id];
    return [];
  }));
  const tested = requirements.filter((requirement) => testedRequirements.has(requirement.id)).length;
  const completeness = Math.max(0, Math.round((required.filter((type) => present.has(type)).length / required.length) * 100));
  const traceability = Math.max(0, Math.round((linked.size / Math.max(project.artifacts.length, 1)) * 100));
  const testing = requirements.length ? Math.round((tested / requirements.length) * 100) : 100;
  const consistency = Math.max(0, 100 - issues.filter((i) => i.severity === "critical").length * 14 - issues.filter((i) => i.severity === "warning").length * 5);
  const architecture = present.has("architecture") && present.has("api") && present.has("database") ? 96 : project.complexity === "SIMPLE" ? 100 : 65;
  return { overall: Math.round((completeness + consistency + traceability + architecture + testing) / 5), completeness, consistency, traceability, architecture, testing, issues };
}

export function analyzeImpact(project: Project, artifactId: string) {
  const visited = new Set([artifactId]);
  const queue = [{ id: artifactId, depth: 0 }];
  const affected: Array<{ artifact: Artifact; reason: string; depth: number }> = [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of project.relationships.filter((item) => item.sourceId === current.id || item.targetId === current.id)) {
      const nextId = edge.sourceId === current.id ? edge.targetId : edge.sourceId;
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      const artifact = project.artifacts.find((item) => item.id === nextId);
      if (artifact) affected.push({ artifact, reason: edge.reason, depth: current.depth + 1 });
      if (current.depth < 3) queue.push({ id: nextId, depth: current.depth + 1 });
    }
  }
  return { severity: affected.length >= 5 ? "HIGH" : affected.length >= 2 ? "MEDIUM" : "LOW", sourceId: artifactId, affected } as const;
}

export function discoveryState(answers: Record<string, string>) {
  const fields = ["goal", "users", "problem", "journey", "features", "data", "auth", "scale", "deployment"];
  const missing = fields.filter((field) => !answers[field]?.trim());
  return { completeness: Math.round(((fields.length - missing.length) / fields.length) * 100), missing, sufficient: missing.length <= 2 };
}
