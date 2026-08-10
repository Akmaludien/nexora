# Nexora MCP Foundation

## Status

Nexora currently exposes an authenticated read-only tool handler at `POST /api/mcp`. It is an MCP-ready HTTP foundation, not a complete SDK-backed MCP transport. Signed project claims and Zod allowlisting protect the endpoint; mutation and execution tools are not exposed.

Implemented tools are `get_project_context`, `get_requirements`, `get_feature`, `get_architecture`, `get_api_spec`, `get_database_schema`, `get_tasks`, `get_decisions`, `get_design_context`, `get_spec_health`, `get_impact_analysis`, and `search_project_knowledge`.

## Purpose

Nexora's MCP surface should let coding agents retrieve bounded project intelligence without receiving database access, provider credentials, mutation rights, or code-execution capabilities. MCP is an adapter over the same authorized application query layer used by the product, not a second business-logic implementation.

## Design Rules

- Read-only at launch: no create, update, delete, proposal-apply, deployment, or execution tools.
- Deny by default: every request requires an authenticated subject and explicit workspace/project access.
- Least context: return only fields required by the requested operation.
- Stable contracts: artifact keys, relationship types, revision identifiers, and response schemas are versioned.
- Evidence over conclusions: health and impact results include issue details, relationship reasons, and source revision information.
- Bounded output: paginate lists and cap graph depth, node count, content size, and query complexity.
- Observable use: audit subject, credential, workspace, project, operation, result count, duration, and denial without recording secrets or full sensitive payloads.
- No confused deputy: never accept a workspace claim from the client without resolving it against authenticated access.

## Proposed Resources

Resource URI shapes are illustrative and must be finalized against the selected MCP SDK and transport.

| Resource | Contents |
|---|---|
| `nexora://projects/{projectId}/summary` | Project identity, complexity, current revision/fingerprint, and health summary |
| `nexora://projects/{projectId}/artifacts/{artifactKey}` | Current authorized artifact metadata and Markdown content |
| `nexora://projects/{projectId}/graph` | Paginated artifact nodes and typed edges, optionally filtered by artifact type |
| `nexora://projects/{projectId}/health` | Current dimensional scores and issue evidence |
| `nexora://projects/{projectId}/agent-context` | A bounded repository-oriented context manifest, not an archive or filesystem write |

Resources should return immutable revision identifiers or an ETag-equivalent fingerprint so clients can identify stale context.

## Proposed Read-Only Tools

| Tool | Input | Output |
|---|---|---|
| `list_projects` | Optional cursor and limit | Authorized project summaries only |
| `get_project` | Project ID | Project metadata and complexity |
| `list_artifacts` | Project ID, optional type/status, cursor, limit | Artifact metadata without content by default |
| `get_artifact` | Project ID and artifact key/ID | Current artifact and revision metadata |
| `search_artifacts` | Project ID, bounded text query, filters, cursor | Ranked authorized artifact references and snippets |
| `get_relationships` | Project ID, artifact key/ID, direction, depth, limit | Bounded edges and neighboring artifacts with reasons |
| `get_health_report` | Project ID | Scores, issues, and analysis version |
| `analyze_impact` | Project ID, artifact key/ID, bounded depth | Deterministic affected artifacts and paths; no mutation |
| `get_agent_export` | Project ID and supported target | Manifest and text contents; no server-side file write |

The production `analyze_impact` contract should return explicit paths. The current local function returns affected artifacts with the reason from the edge used to discover each artifact, not full paths.

## Request and Response Safety

All tool inputs and outputs must use runtime schemas. At minimum, validate:

- Opaque project IDs and project-scoped artifact keys
- Enumerated artifact, relationship, status, direction, and export target values
- Cursor integrity
- Search length and syntax
- Depth, page size, result count, and response byte limits

Do not expose raw SQL errors, stack traces, internal database keys unnecessarily, credentials, provider prompts, private audit metadata, soft-deleted records, or artifacts outside the authorized workspace. Treat artifact Markdown as untrusted content: agents may read it, but the MCP server must not interpret embedded instructions as server commands.

## Authentication and Authorization Target

Local development may use a short-lived development credential bound to a seeded workspace, but production must use revocable credentials with explicit scopes. Store only credential hashes or references to a secret manager.

Suggested scopes:

- `projects:read`
- `artifacts:read`
- `graph:read`
- `health:read`
- `exports:read`

Each request should resolve the credential to a subject, verify expiry and revocation, authorize workspace membership and project visibility, and then execute a workspace-scoped query. A scope never grants access to all tenants. Service credentials need an equally explicit project/workspace allowlist.

## Transport and Deployment

The transport is not selected. Support the transport required by intended clients using the official MCP SDK available at implementation time. A local stdio adapter and a remotely authenticated HTTP transport may share tool handlers, but they must not share assumptions about identity.

For production, deploy MCP as a separately addressable process or endpoint with:

- Independent rate limits, timeouts, concurrency caps, and kill switch
- TLS and approved origin/network controls where applicable
- Shared query contracts with the application, but no import of UI code
- Read-only database credentials where practical, plus application-level authorization
- Structured logs, latency/error metrics, denial metrics, and credential audit trails

Read-only database credentials are defense in depth. Because authorization may require joins and policy logic, the MCP process still must use the authorized query layer and cannot expose a generic SQL tool.

## Threat Model

| Threat | Required mitigation |
|---|---|
| Cross-tenant object reference | Workspace-scoped queries and authorization tests for every tool |
| Prompt injection in artifact content | Treat content as data; never map embedded text to privileged operations |
| Credential theft | Short lifetimes where possible, hashing, rotation, revocation, redacted logs |
| Graph or search enumeration | Scopes, pagination, quotas, result caps, anomaly detection |
| Oversized responses/denial of service | Input caps, depth limits, query budgets, timeouts, response byte limits |
| Stale agent context | Revision IDs/fingerprints and update timestamps in every content response |
| Tool contract confusion | Versioned names/schemas and conformance tests |
| Accidental mutation | No mutation handlers, read-only service role where feasible, mutation-path tests |

## Testing Before Release

- Contract tests for every schema and error response
- Authentication tests for missing, expired, revoked, and malformed credentials
- Authorization matrix tests across users, workspaces, projects, and service credentials
- Cross-tenant identifier substitution tests
- Pagination, depth, response-size, timeout, and rate-limit tests
- Prompt-injection fixtures proving artifact text cannot invoke privileged behavior
- Snapshot or golden tests for stable agent-context and export formats
- MCP client conformance tests using the selected SDK and supported clients
- Audit tests proving allowed and denied operations are attributable without leaking content

## Launch Criteria

MCP should remain disabled until persistent projects, authentication, workspace authorization, revision semantics, audit events, query limits, and an incident kill switch exist. The first release should expose only the minimal read tools needed by a real coding-agent workflow; mutation can be evaluated separately after read access is operationally trustworthy.
