# Database Architecture

Nexora uses PostgreSQL through Prisma. The schema is defined in `prisma/schema.prisma` and models project knowledge as stable artifacts connected by typed, directed relationships. Markdown remains an editing and export format; relational records remain the source of truth.

## Core ownership

- `User` is the account identity. Deleting a user is intentionally restricted while a project membership exists, preserving authorization history. Author and reviewer references become null when an identity is removed.
- `Project` is the tenant and deletion boundary for project knowledge. Its `key` is a stable external identifier; UUIDs remain internal primary keys.
- `ProjectMember` is the authorization boundary between users and projects. The `(projectId, userId)` unique constraint prevents duplicate memberships. Roles are `OWNER`, `ADMIN`, `EDITOR`, and `VIEWER`.
- `UserSetting` and `ProjectSetting` separate personal preferences from project policy. Their `metadata` columns are reserved for settings that do not yet justify queryable columns.

Every server-side project query must be scoped through an active `ProjectMember`. The schema provides tenant keys and constraints but does not replace application authorization or PostgreSQL row-level security.

## Project knowledge graph

`Artifact` supplies stable identity, project ownership, type, lifecycle status, and the latest version number. Its `key` maps to human-facing identifiers such as `REQ-001`; `(projectId, key)` is unique.

`ArtifactVersion` stores immutable title and Markdown snapshots. A new edit should insert the next `(artifactId, version)` record and update `Artifact.currentVersion` in the same transaction. Old versions cascade only when their artifact is deliberately deleted.

`ArtifactRelationship` is a directed graph edge. Composite foreign keys include `projectId` for both endpoints, making cross-project relationships impossible. Duplicate edges of the same type are rejected. The supported relationship vocabulary matches the application contracts: dependency, implementation, impact, requirement, mapping, validation, and derivation.

Artifact detail tables normalize queryable domain data without duplicating graph identity:

| Detail | Structured data |
|---|---|
| `Requirement` | Priority, rationale, ordered acceptance criteria |
| `Feature` | Priority and milestone assignment |
| `UserStory` | Persona, goal, benefit, priority |
| `BusinessRule` | Expression and enforcement guidance |
| `Decision` | ADR status, context, choice, consequences, supersession |
| `Component` | Architectural kind, boundary, technology |
| `Endpoint` | HTTP method/path and normalized parameters |
| `Entity` | Physical name and normalized fields |
| `Milestone` | Schedule, ordering, lifecycle |
| `Task` | Workflow state, priority, assignee, estimate, milestone |
| `TestCase` | Test kind, automation location, ordered steps |
| `DesignContext` | External design source/version and flexible source payload |

PRDs, user flows, API/database/architecture/security/testing documents, and roadmaps need no extra detail row until they gain structured fields. Their identity, content, versions, and graph links still live in the common artifact tables.

The detail row type must match `Artifact.type`. Prisma cannot express this conditional constraint declaratively, so service writes must enforce it. A production migration may add deferred PostgreSQL constraint triggers if writes can bypass the service.

## AI and impact review

`AiConversation` and `AiMessage` preserve project-scoped model interactions, token counts, latency, provider identifiers, failures, and optional threading. `ConversationArtifact` records the bounded project context supplied to a conversation. Composite project keys prevent a conversation from receiving context from another project.

`ImpactAnalysis` starts from one artifact. Its `ImpactItem` rows retain each affected artifact, traversal depth, causal relationship, explanation, proposed JSON patch, and independent accept/reject review. Applying accepted items should create artifact versions transactionally; proposals must never silently overwrite current content.

`SpecIssue` stores health and consistency findings. A nullable fingerprint supports idempotent regeneration, while resolution attribution survives user removal. Issues attached to an artifact are deleted with that artifact; project-level issues have no artifact.

## Exports and integrations

`ProjectExport` records export jobs and retention. `ExportFile` normalizes generated paths instead of placing a file map in JSON. Content may be inline for small exports or referenced by `storageKey` for object storage.

`McpAccessGrant` stores only a token prefix for display and a one-way token hash for authentication. Grants are project scoped, expirable, revocable, and read-only by default. `allowedTools` is a PostgreSQL string array because it is a bounded scalar list, not relational metadata.

`ProviderCredential` stores encrypted bytes and the external key identifier needed to decrypt them. Plaintext API keys, OAuth tokens, and refresh tokens must never be persisted or logged. Credentials are project scoped and user owned; application code must verify that the owner has an active membership before use.

## JSON policy

JSON is limited to genuinely flexible data: metadata, design-provider payloads, issue diagnostics, and proposed impact patches. Queryable relationships, acceptance criteria, endpoint parameters, entity fields, test steps, generated files, and reviews are normalized.

## Index and constraint strategy

- Foreign keys used for authorization and traversal have supporting indexes.
- Project dashboards are supported by status/time indexes on projects, artifacts, conversations, impacts, issues, and exports.
- Graph traversal is supported in both directions by source and target composite indexes.
- Human keys, artifact versions, memberships, endpoint signatures, ordered child records, and graph edges use unique constraints to prevent duplicates.
- Composite foreign keys on graph edges, tasks, features, issues, and impact sources enforce project consistency.

Prisma does not represent general `CHECK` constraints in this schema. The first SQL migration should add checks for:

```sql
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_completeness_check"
  CHECK ("completeness" BETWEEN 0 AND 100);

ALTER TABLE "Artifact"
  ADD CONSTRAINT "Artifact_currentVersion_check"
  CHECK ("currentVersion" >= 1);

ALTER TABLE "ArtifactRelationship"
  ADD CONSTRAINT "ArtifactRelationship_distinct_nodes_check"
  CHECK ("sourceArtifactId" <> "targetArtifactId");

ALTER TABLE "AcceptanceCriterion"
  ADD CONSTRAINT "AcceptanceCriterion_position_check" CHECK ("position" >= 0);

ALTER TABLE "ImpactItem"
  ADD CONSTRAINT "ImpactItem_depth_check" CHECK ("depth" >= 0);
```

Also add non-negative checks for token counts, latency, estimates, positions, file sizes, and export artifact counts. Keep these additions in migrations so Prisma-generated clients remain compatible.

## Deletion and retention

Deleting a project cascades through its artifacts, graph, conversations, analyses, issues, exports, grants, and project-scoped credentials because the project is their ownership boundary. Deleting an artifact removes its versions and structured detail; relationships and derived findings that cannot exist without it also disappear.

User attribution generally uses `ON DELETE SET NULL`, preserving operational history without retaining a hard identity dependency. Membership uses `RESTRICT` to require explicit offboarding. Composite tenant-safe links for task assignments, milestones, decision supersession, conversation impacts, and causal impact edges also use `RESTRICT`: unlink those records explicitly before deleting their targets. This avoids PostgreSQL trying to null the required `projectId` portion of a composite foreign key.

For normal product operations, prefer archival/status transitions over hard deletion. Define retention jobs for expired exports, old conversations, revoked MCP grants, and superseded provider credentials. Backups, point-in-time recovery, encryption key rotation, and restore testing remain deployment responsibilities outside Prisma.

## Transaction boundaries

Use transactions for:

1. Creating an artifact, its first version, and optional detail row.
2. Appending a version and advancing `currentVersion` with optimistic concurrency.
3. Applying accepted impact items and recording all resulting versions.
4. Creating a project with its owner membership and default settings.
5. Revoking credentials or MCP grants while invalidating active consumers.

Use cursor pagination for messages, versions, issues, and export history. For large graph traversals, use a parameterized PostgreSQL recursive CTE with explicit project scoping and a depth limit.
