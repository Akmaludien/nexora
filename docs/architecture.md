# Nexora Architecture

## Status Convention

This document separates repository facts from design intent:

- **Current**: implemented in this repository.
- **Target**: proposed production architecture; not implemented unless explicitly stated otherwise.

## Current Architecture

The present codebase is a Next.js 16 modular application with PostgreSQL/Prisma persistence, revocable opaque sessions, project-role authorization, validated APIs, deterministic intelligence, provider-neutral AI, and read-only MCP-style tools.

```text
demoProject
    |
    v
Project { artifacts, relationships }
    |                 |                 |
    v                 v                 v
calculateHealth   analyzeImpact   buildAgentExport

Discovery answers --> discoveryState
Project inputs    --> classifyComplexity
```

### Domain model

`src/lib/types.ts` defines:

- `Project`: identity, description, complexity, a stored completeness value, artifacts, and relationships.
- `Artifact`: stable string ID, type, Markdown content, status, version, timestamp, optional acceptance criteria, and optional milestone.
- `Relationship`: directed source and target IDs, a typed relationship, and a human-readable reason.
- `HealthReport`: aggregate and dimensional scores plus issues.

Artifact types cover PRDs, requirements, features, user stories, business rules, flows, APIs, databases, architecture, security, testing, roadmaps, tasks, decisions, and design context. Relationship types are `depends_on`, `implements`, `affects`, `requires`, `maps_to`, `validates`, and `derived_from`.

Runtime graph types stay small; the normalized Prisma schema encodes users, members, versions, ownership, decisions, AI history, exports, and MCP grants for a production adapter.

### Intelligence

`src/lib/intelligence.ts` is deterministic and local:

- `classifyComplexity` maps a weighted numeric score to five complexity bands.
- `calculateHealth` compares artifact types with the required set for the project's complexity. It also checks graph connectivity, requirement acceptance criteria, feature milestones, architecture coverage, and requirement-to-test relationships.
- `analyzeImpact` treats relationships as traversable in either direction and performs breadth-first traversal. Nodes reached from depths zero through three can be added, which means returned affected nodes may have depth up to four. Severity depends only on the number of affected artifacts.
- `discoveryState` measures whether nine named text answers are present and considers discovery sufficient with at most two missing fields.

These pure functions do not persist results. API routes authorize signed project claims and validate untrusted input before invoking them. `Project.completeness` is independent from calculated health completeness.

### Demo and export

`src/lib/demo.ts` contains a fixed `LARGE` sample project named Orbit Workspace. Its product claims are demonstration data, not implemented Nexora features.

`src/lib/export.ts` builds the agent file set from persisted project knowledge. The export route packages it as a downloadable ZIP, adds relationships, and records checksum metadata.

## Target Production Architecture

A modular monolith is the preferred first production shape. It keeps authorization and transactions close to the graph while preserving boundaries that can later move to workers or independent services.

```text
Browser
  |
  v
Next.js application
  |-- UI and server-rendered views
  |-- authenticated commands and queries
  |-- domain services and validation
  |
  +----> PostgreSQL (system of record)
  +----> job queue/worker (AI and long-running analysis)
  +----> AI provider adapter(s)
  +----> audit/telemetry sinks

Read-only MCP server
  |-- authenticated, workspace-scoped queries
  +----> shared application query layer --> PostgreSQL
```

### Dependency direction

1. UI and protocol adapters depend on application commands and queries.
2. Application services depend on domain rules and repository/provider interfaces.
3. Infrastructure implements persistence, AI, authentication, queues, and telemetry.
4. Domain code does not depend on Next.js, PostgreSQL clients, or provider SDKs.

Start with these logical modules: identity/workspaces, projects, artifacts, relationships, intelligence, proposals, exports, and MCP queries. They may remain folders in one deployment until scale or operational ownership justifies separation.

## Target PostgreSQL Data Model

The following is a target relational model, not an existing schema or migration.

| Table | Key fields and purpose |
|---|---|
| `users` | `id`, normalized unique email, display name, timestamps |
| `workspaces` | `id`, name, slug, timestamps |
| `workspace_memberships` | workspace/user foreign keys, role, status, joined timestamp; unique pair |
| `projects` | `id`, workspace foreign key, name, description, complexity, timestamps, archived timestamp |
| `artifacts` | `id`, project foreign key, stable project-scoped key such as `REQ-001`, type, title, status, current revision number, timestamps; unique `(project_id, key)` |
| `artifact_revisions` | artifact foreign key, revision number, Markdown content, structured metadata JSON, author, source, created timestamp; unique `(artifact_id, revision_number)` |
| `relationships` | `id`, project foreign key, source/target artifact foreign keys, type, reason, creator, timestamps; unique semantic edge constraint |
| `analysis_runs` | project foreign key, analysis kind, input revision/fingerprint, status, score/result JSON, timestamps |
| `issues` | project/artifact foreign keys, analysis run foreign key, severity, code, message, resolution state, timestamps |
| `change_proposals` | project foreign key, provider/model metadata, rationale, status, creator/reviewer, timestamps |
| `proposal_changes` | proposal and artifact foreign keys, base revision, proposed content or patch, relationship path/reason JSON |
| `audit_events` | workspace, actor, action, target type/ID, request metadata, timestamp; append-only operational record |
| `mcp_credentials` | workspace/subject, hashed credential or token reference, scopes, expiry/revocation timestamps |

Recommended integrity rules:

- Use UUIDs or time-sortable UUIDs internally; keep human-readable artifact keys stable and project-scoped.
- Require source and target artifacts to belong to the relationship's project. Enforce this transactionally, with composite foreign keys or a database trigger if ordinary foreign keys cannot express it cleanly.
- Preserve immutable revisions; update an artifact's current revision pointer in the same transaction.
- Use check constraints or PostgreSQL enums for bounded statuses and types only when migration discipline is established.
- Index every foreign key, `(workspace_id, updated_at)` project access paths, `(project_id, type/status)` artifact filters, both relationship endpoints, and unresolved issue queries.
- Prefer normalized graph edges over storing the graph as a single JSON document. Use JSONB only for flexible metadata and captured analysis output.
- Scope every tenant-owned query by workspace. PostgreSQL row-level security can provide defense in depth, but does not replace application authorization and transaction tests.

## Target AI Architecture

A deterministic local provider and an OpenAI-compatible server provider are implemented. Selection uses `AI_PROVIDER`; `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` configure external inference.

The first adapter should support a `mock` mode for deterministic local development and tests. A production adapter may target an OpenAI-compatible endpoint through `AI_BASE_URL`; native adapters for other vendors should be added only where API semantics require them. Do not assume that setting the current environment variables activates AI behavior.

Provider calls should:

- Run only on the server or a trusted worker.
- Receive the smallest authorized context required for a job.
- Use schema-validated structured outputs before domain application.
- Record provider, model, prompt/template version, latency, token usage, and outcome without logging secrets or unnecessary project content.
- Produce proposals for review rather than silently rewriting validated artifacts.
- Apply timeouts, bounded retries with jitter, quotas, cancellation, and idempotency keys.
- Keep provider credentials encrypted at rest and out of client bundles.

## Security Boundaries

The demo uses HMAC-signed expiring sessions, project claims, secure cookies, origin checks, Zod validation, CSP/security headers, and AI rate limiting. Full multi-workspace identity and durable authorization remain production work.

Production controls must include:

- Server-side authentication and session validation.
- Workspace membership checks on every command and query, including exports and MCP tools.
- Deny-by-default authorization with opaque behavior for cross-workspace identifiers.
- Runtime validation at HTTP, job, provider-output, import, and MCP boundaries.
- CSRF protection for cookie-authenticated mutations, secure cookies, CSP, and security headers.
- Escaped or sanitized Markdown rendering; raw HTML must remain disabled unless separately sanitized.
- Rate limits and quotas for authentication, exports, AI jobs, and MCP calls.
- Encryption in transit, managed encryption at rest, secret rotation, and no secret logging.
- Immutable audit events for membership, credential, artifact, relationship, proposal, export, and administrative actions.
- Backup, point-in-time recovery, restore testing, retention, deletion, and incident response procedures.

## Consistency and Jobs

Artifact mutation, revision creation, relationship validation, and audit insertion should be transactional. Health reports can be computed synchronously for small projects and cached or queued for larger ones. AI analysis belongs in background jobs because provider latency and retries should not hold web requests open.

Workers must verify authorization-relevant ownership from persisted records rather than trusting IDs from job payloads. Proposal application must use optimistic concurrency against the captured base revision to prevent overwriting newer edits.

## Deployment Target

The eventual production deployment needs:

- A Node.js-compatible Next.js runtime for the web application.
- Managed PostgreSQL with TLS, migrations, backups, and connection pooling appropriate to the runtime.
- A durable queue and worker runtime before asynchronous AI jobs are enabled.
- Secret management for database, auth, AI, and MCP credentials.
- Central logs, metrics, traces, error reporting, and audit retention.
- A separately addressable MCP endpoint or process when MCP is introduced.

CI should gate deployment on dependency installation, lint, type checking, tests, and `next build`. Database changes additionally require migration validation against an empty database and an upgraded representative database. Production rollout should use staged environments and a documented rollback path; application rollback must remain compatible with already-applied migrations.

## Architecture Decisions Still Open

- Authentication/session implementation and role vocabulary
- PostgreSQL client, migration framework, and optional row-level security strategy
- Queue and worker platform
- Initial production AI provider and structured-output contract
- MCP transport and credential exchange
- Artifact key allocation under concurrent creation
- Search strategy, from PostgreSQL full-text search initially to a separate index only if measured needs justify it
