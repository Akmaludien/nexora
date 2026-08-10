export type ArtifactType = "prd" | "requirement" | "feature" | "user-story" | "business-rule" | "user-flow" | "api" | "database" | "architecture" | "security" | "testing" | "roadmap" | "task" | "decision" | "design-context";
export type RelationshipType = "depends_on" | "implements" | "affects" | "requires" | "maps_to" | "validates" | "derived_from";
export type Complexity = "SIMPLE" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: "Draft" | "Review" | "Validated";
  version: number;
  updatedAt: string;
  acceptanceCriteria?: string[];
  milestone?: string;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  reason: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  complexity: Complexity;
  completeness: number;
  artifacts: Artifact[];
  relationships: Relationship[];
}

export interface SpecIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  artifactId: string;
  message: string;
}

export interface HealthReport {
  overall: number;
  completeness: number;
  consistency: number;
  traceability: number;
  architecture: number;
  testing: number;
  issues: SpecIssue[];
}
