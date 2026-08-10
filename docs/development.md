# Nexora Development

## Current State

Nexora is a working Next.js application backed by PostgreSQL and Prisma. One persisted project-knowledge repository supplies the editor, versions, AI, health, graph, impact, discovery, MCP, and exports.

## Prerequisites

- Node.js 22 recommended
- npm, or the package manager associated with the repository lockfile
- PostgreSQL; `npm run db:dev` starts a persistent embedded instance for local development

## Local Setup

```bash
npm install
```

Optional environment setup for future integration work:

```powershell
Copy-Item .env.example .env.local
```

Do not commit `.env.local`. `DATABASE_URL` is required. Seed credentials are used only to create bcrypt-hashed initial users.

### Environment contract

| Name | Required now | Production sensitivity | Intended use |
|---|---:|---|---|
| `DATABASE_URL` | Yes | Secret | PostgreSQL connection string |
| `SEED_OWNER_EMAIL` | Seed | Configuration | Initial owner account |
| `SEED_OWNER_PASSWORD` | Seed | Secret | Hashed with bcrypt before insertion |
| `AI_PROVIDER` | No | Configuration | Provider adapter name; `mock` is the intended local/test default |
| `AI_BASE_URL` | No | Configuration/sensitive topology | Optional provider or gateway URL |
| `AI_API_KEY` | No | Secret | Server-only AI credential |
| `AI_MODEL` | No | Configuration | Deployment-selected model identifier |

Validate environment variables once at server startup when integrations are added. Fail closed in production, permit the explicit `mock` provider in local/test environments, and never place secrets in `NEXT_PUBLIC_*` variables.

## Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the application at `http://localhost:3000` |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checking without output |
| `npm test` | Run Vitest once in jsdom |
| `npm run test:watch` | Run Vitest interactively |
| `npm run build` | Validate and build the production Next.js application |
| `npm run start` | Serve a previously successful production build |

Before proposing a change, run:

```bash
npm run lint
npm run typecheck
npm test
```

Run `npm run build` for application, route, framework configuration, or deployment changes.

## Code Organization

Current source responsibilities:

- `src/lib/types.ts`: compile-time domain vocabulary.
- `src/lib/intelligence.ts`: pure complexity, health, impact, and discovery calculations.
- `src/lib/demo.ts`: fixed sample data for development and eventual UI demonstration.
- `src/lib/export.ts`: pure construction of an agent-export object.
- `src/lib/project-repository.ts`: transactional source-of-truth access.
- `src/lib/impact-repository.ts`: persistent proposal and decision lifecycle.
- `src/lib/discovery-repository.ts`: persisted adaptive discovery.

Keep deterministic domain rules independent from Next.js and infrastructure. When adding application code, prefer explicit feature boundaries and server-only modules for persistence, credentials, authorization, provider calls, and export generation. Client components must receive already-authorized data and must never be treated as an access-control boundary.

## Domain Invariants

New persistence and APIs should preserve these rules:

- Artifact keys are stable within a project.
- Relationship endpoints exist in the same project.
- Relationship types and artifact types are validated at runtime, not only by TypeScript.
- Validated artifacts change through immutable revisions and optimistic concurrency.
- Every relationship has an explainable reason.
- AI output is untrusted until schema validation and user review.
- Workspace authorization occurs before reading content, calculating exports, or scheduling jobs.

Be aware of current demonstration behavior when testing:

- Impact traversal follows edges in either direction.
- The traversal can return nodes at depth four even though new queue entries stop after processing depth three.
- Health completeness is calculated independently from `Project.completeness`.
- Validation coverage supports both normalized requirement-to-test and test-to-requirement edge direction.
- Agent exports are streamed as ZIP files and checksummed in PostgreSQL.

## Testing Strategy

Vitest runs regression tests for sessions, complexity, discovery, health, impact, exports, and MCP allowlisting.

### Unit tests

Add table-driven tests for:

- Every complexity threshold and the regulation/expected-user modifiers
- Required artifacts for each complexity
- Empty projects, disconnected artifacts, missing criteria, and missing milestones
- Requirement-to-test direction and duplicate edges
- Impact cycles, disconnected nodes, depth limits, missing source IDs, and severity thresholds
- Discovery whitespace, missing keys, and sufficiency boundaries
- Export target manifests, stable artifact paths, and unsafe/duplicate artifact keys once runtime input is accepted

### Integration tests

`npm run test:integration` exercises repository transactions against PostgreSQL. `npm run test:e2e` exercises authenticated HTTP persistence, restore, viewer denial, impact, discovery, ZIP export, and session revocation.

### UI and end-to-end tests

When routes exist, cover primary discovery, graph navigation, artifact editing, health inspection, impact review, and export workflows. Include keyboard navigation, visible focus, accessible names, narrow/mobile layouts, and Markdown content designed to test rendering safety.

### AI and MCP tests

Use a deterministic mock provider in normal CI. Keep recorded or live provider tests optional, redacted, quota-limited, and outside required pull-request checks. Validate structured output, timeout/retry behavior, stale proposal handling, and cost metadata. MCP requires schema, conformance, authorization-matrix, cross-tenant, limit, and prompt-injection tests described in [mcp.md](mcp.md).

## Security Review Checklist

Any change that adds a trust boundary must answer:

- What authenticates the caller?
- Which workspace and project authorize the action?
- Which runtime schema validates the input and external output?
- Can identifiers be substituted to cross tenant boundaries?
- Is content rendered or exported safely?
- Are secrets server-only and redacted from logs/errors?
- Are mutations protected from CSRF, replay, duplicate jobs, and stale revisions as applicable?
- Is the action rate-limited and audited?
- What data reaches an AI provider, and is that data necessary?
- Can the operation be disabled during an incident?

Do not enable raw HTML in Markdown without a reviewed sanitizer and tests. Do not provide generic SQL, filesystem, URL-fetch, or command-execution facilities to AI or MCP consumers.

## Database Workflow

Prisma owns the checked-in migration workflow:

1. Make every schema change through a checked-in migration.
2. Test migration from an empty database and from the previous supported schema.
3. Use expand-and-contract changes when application versions overlap.
4. Keep destructive changes separate, measured, backed up, and reversible where practical.
5. Verify indexes and query plans using representative tenant sizes.
6. Test restore and point-in-time recovery outside the migration path.

The target entities and constraints are documented in [architecture.md](architecture.md).

## AI Provider Development Target

Provider code should implement a narrow application-owned interface rather than leak vendor request types through the domain. Selection comes from `AI_PROVIDER`; `AI_BASE_URL` supports a gateway or compatible endpoint; model IDs remain configuration. The `mock` adapter must perform no network access.

Do not log API keys, complete prompts containing sensitive project data, or raw provider responses by default. Persist enough metadata for reproducibility and cost analysis: provider, model, template version, input revision, token counts where available, latency, finish state, and validation outcome.

## Deployment Checklist

The single-project demo is suitable for evaluation. Before a multi-user production launch:

- Use managed PostgreSQL with connection pooling, TLS, backups, and restore drills.
- Add self-service registration, password reset, and email verification where product scope requires them.
- Validate configuration at startup and provision secrets outside the source tree.
- Add distributed rate-limit storage and persistent audit trails.
- Add health/readiness checks that do not expose secrets.
- Add logs, metrics, traces, error reporting, and alert ownership.
- Configure backups, retention, restore drills, and data deletion procedures.
- Run unit, integration, authorization, migration, accessibility, and end-to-end tests.
- Keep AI and MCP disabled until their specific controls and kill switches are ready.

For each release, record the application version and database migration state. Prefer backward-compatible migrations so a failed application rollout can be reverted without reverting committed user data.

## Pull Request Expectations

- Keep changes scoped and preserve established domain vocabulary.
- Include tests proportional to behavioral and security risk.
- Update documentation when environment, data, protocol, deployment, or user behavior changes.
- Explain migrations, operational rollout, and rollback where relevant.
- Never include credentials, production project content, or unredacted provider payloads in fixtures.
