import type { Artifact, Project } from "./types";

const now = "2026-08-10T09:00:00.000Z";
const artifact = (id: string, type: Artifact["type"], title: string, content: string, extra: Partial<Artifact> = {}): Artifact => ({ id, type, title, content, status: "Validated", version: 2, updatedAt: now, ...extra });

export const demoProject: Project = {
  id: "nexora-demo",
  name: "Orbit Workspace",
  description: "AI-powered SaaS project management for distributed product teams.",
  complexity: "LARGE",
  completeness: 89,
  artifacts: [
    artifact("PRD-001", "prd", "Product vision", "# Orbit Workspace\n\n## Vision\nGive distributed teams a shared operating picture for outcomes, work, and delivery risk.\n\n## Users\nProduct managers, engineers, designers, and workspace administrators.\n\n## Success\nTeams can plan, execute, and review a delivery cycle without fragmented status reporting."),
    artifact("REQ-001", "requirement", "Secure workspace access", "# REQ-001\n\nMembers must authenticate and may only access workspaces where they hold an active membership.", { acceptanceCriteria: ["Unauthenticated requests are rejected", "Cross-workspace access returns 404"] }),
    artifact("REQ-002", "requirement", "Collaborative task board", "# REQ-002\n\nMembers can create, assign, prioritize, and move tasks through a configurable workflow.", { acceptanceCriteria: ["Every state change is recorded", "Members see current task state"] }),
    artifact("REQ-003", "requirement", "Delivery risk summary", "# REQ-003\n\nThe system identifies blocked and overdue work and summarizes milestone risk.", { acceptanceCriteria: ["Blocked dependencies contribute to risk", "Risk includes an explanation"] }),
    artifact("FEAT-001", "feature", "Workspace identity", "# FEAT-001\n\nEmail sign-in, sessions, roles, and workspace isolation.", { milestone: "M1 Foundation" }),
    artifact("FEAT-002", "feature", "Planning board", "# FEAT-002\n\nA keyboard-friendly board and list for task planning.", { milestone: "M2 Planning" }),
    artifact("US-001", "user-story", "Manage a task", "# US-001\n\nAs a contributor, I want to update a task so that the team sees current delivery state."),
    artifact("FLOW-001", "user-flow", "Create and deliver work", "# FLOW-001\n\nOpen project -> create task -> assign owner -> start work -> complete -> review milestone."),
    artifact("RULE-001", "business-rule", "Workspace isolation", "# RULE-001\n\nEvery domain query must be scoped by the authenticated member's workspace."),
    artifact("API-001", "api", "Task API", "# API-001\n\n`POST /api/tasks` creates a validated task. `PATCH /api/tasks/:id` records a versioned state transition."),
    artifact("DB-001", "database", "Task entity", "# DB-001\n\nTask(id, projectId, title, status, priority, assigneeId, dueAt, createdAt, updatedAt)."),
    artifact("ARCH-001", "architecture", "Modular monolith", "# ARCH-001\n\nNext.js application boundary, PostgreSQL system of record, background AI jobs, and typed domain modules."),
    artifact("SEC-001", "security", "Security controls", "# SEC-001\n\nServer-side authorization, secure sessions, Zod input validation, encrypted provider credentials, CSP, and audit events."),
    artifact("TEST-001", "testing", "Workspace isolation tests", "# TEST-001\n\nVerify unauthenticated, unauthorized, and valid member access paths."),
    artifact("ROAD-001", "roadmap", "Delivery roadmap", "# ROAD-001\n\nM1 Foundation -> M2 Planning -> M3 Intelligence -> M4 Integrations."),
    artifact("TASK-001", "task", "Implement workspace authorization", "# TASK-001\n\nAdd server-side project membership policy and regression tests."),
    artifact("ADR-001", "decision", "Authentication strategy", "# ADR-001\n\n## Decision\nUse database-backed secure sessions.\n\n## Consequences\nImmediate revocation and server-side project authorization are straightforward."),
    artifact("DESIGN-001", "design-context", "Product interface rules", "# DESIGN-001\n\nDense work surfaces, WCAG AA contrast, 4px spacing base, visible focus, and keyboard-first navigation."),
  ],
  relationships: [
    { id: "E-001", sourceId: "PRD-001", targetId: "REQ-001", type: "derived_from", reason: "Secure collaboration requires authenticated workspace boundaries." },
    { id: "E-002", sourceId: "REQ-001", targetId: "FEAT-001", type: "implements", reason: "Workspace identity implements the access requirement." },
    { id: "E-003", sourceId: "REQ-002", targetId: "FEAT-002", type: "implements", reason: "The planning board implements task collaboration." },
    { id: "E-004", sourceId: "FEAT-002", targetId: "US-001", type: "maps_to", reason: "Task management is the primary board story." },
    { id: "E-005", sourceId: "US-001", targetId: "API-001", type: "requires", reason: "The story persists task changes through the API." },
    { id: "E-006", sourceId: "API-001", targetId: "DB-001", type: "requires", reason: "Task operations require the Task entity." },
    { id: "E-007", sourceId: "REQ-001", targetId: "RULE-001", type: "requires", reason: "Authorization is governed by workspace isolation." },
    { id: "E-008", sourceId: "RULE-001", targetId: "ARCH-001", type: "affects", reason: "The architecture must scope every query by membership." },
    { id: "E-009", sourceId: "REQ-001", targetId: "TEST-001", type: "validates", reason: "Isolation tests validate access boundaries." },
    { id: "E-010", sourceId: "FEAT-001", targetId: "TASK-001", type: "requires", reason: "The feature is delivered by the authorization task." },
    { id: "E-011", sourceId: "ADR-001", targetId: "ARCH-001", type: "affects", reason: "The accepted session decision shapes the architecture." },
    { id: "E-012", sourceId: "DESIGN-001", targetId: "FEAT-002", type: "affects", reason: "Board interactions must follow design and accessibility rules." },
    { id: "E-013", sourceId: "REQ-002", targetId: "FLOW-001", type: "maps_to", reason: "The delivery flow exercises collaborative planning." },
    { id: "E-014", sourceId: "REQ-003", targetId: "ROAD-001", type: "depends_on", reason: "Risk intelligence is scheduled after planning foundations." },
    { id: "E-015", sourceId: "ARCH-001", targetId: "SEC-001", type: "requires", reason: "Deployment architecture requires explicit security controls." },
  ],
};
