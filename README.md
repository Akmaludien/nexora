# Nexora

Nexora is an early product-intelligence foundation for turning software intent into a typed, traceable project knowledge graph. The intended product connects requirements, features, user stories, APIs, data models, architecture, security, tests, tasks, decisions, and design context so teams and coding agents can understand coverage and the impact of change.

> **Implementation status:** Nexora uses PostgreSQL through Prisma as the authoritative project knowledge store. Artifacts, immutable versions, typed relationships, sessions, memberships, discovery, impact decisions, rate limits, and export metadata survive application restarts.

## Current Capabilities

- A typed project model with 16 artifact types and seven relationship types.
- Complexity classification from project roles, features, integrations, regulation, and expected users.
- Health scoring across completeness, consistency, traceability, architecture, and testing.
- Detection of missing required artifacts, disconnected artifacts, missing requirement acceptance criteria, and features without milestones.
- Relationship traversal for impact analysis, limited to the current breadth-first traversal behavior.
- Discovery completeness checks across nine expected answer fields.
- An idempotent PostgreSQL seed for the `Orbit Workspace` demonstration project.
- Downloadable ZIP exports for OpenCode, Claude, Codex, Spec Kit, and generic targets.
- Responsive landing, dashboard, discovery, editor, graph, health, traceability, impact, decision, and export routes.
- Signed `HttpOnly` sessions, project access claims, origin validation, secure headers, and Zod-validated APIs.
- Context-aware local AI, an OpenAI-compatible server adapter, and authenticated read-only MCP-style tools.

## Not Implemented Yet

- Self-service registration, password reset, and email verification UI
- Organization administration and expanded audit-event reporting
- Background jobs or queues
- Full SDK-backed MCP transport and resources
- Background AI jobs and streaming provider responses

## Technology

- Next.js 16, React 19, and TypeScript 5
- Tailwind CSS 4
- React Flow for the intended graph interface
- React Markdown with GitHub-flavored Markdown support
- Zod for API and MCP boundary validation
- Vitest, jsdom, and Testing Library for tests

## Setup

Prerequisites:

- Node.js 22 is recommended because the project uses `@types/node` 22. Use the package manager associated with the checked-in lockfile.
- PostgreSQL is required. Local development can use the bundled embedded PostgreSQL runtime; production should use managed PostgreSQL.

Install dependencies:

```bash
npm install
```

Create local configuration when working on production integrations:

```bash
cp .env.example .env.local
```

On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

The environment contract is:

| Variable | Current use | Target purpose |
|---|---|---|
| `DATABASE_URL` | Active | Server-only PostgreSQL connection string |
| `SEED_OWNER_EMAIL` | Seed only | Initial owner email |
| `SEED_OWNER_PASSWORD` | Seed only | Initial owner password, bcrypt-hashed before storage |
| `AI_PROVIDER` | Active | `mock` is deterministic and network-free |
| `AI_BASE_URL` | Optional | OpenAI-compatible provider URL |
| `AI_API_KEY` | Optional | Server-only provider credential |
| `AI_MODEL` | Optional | Deployment-selected model |

Never prefix secrets with `NEXT_PUBLIC_` or expose them to client components.

## Commands

```bash
npm run dev        # Start Next.js development tooling
npm run build      # Create a production Next.js build
npm run start      # Run an existing production build
npm run lint       # Run ESLint across the repository
npm run typecheck  # Type-check without emitting files
npm test           # Run Vitest once
npm run test:watch # Run Vitest in watch mode
npm run db:dev     # Start persistent local PostgreSQL
npm run db:migrate # Apply checked-in migrations
npm run db:seed    # Seed the demo owner and project
npm run test:integration # PostgreSQL repository integration tests
npm run test:e2e   # HTTP production-flow tests (requires app on port 3421)
```

Open `http://localhost:3000`. Local demo credentials are prefilled on `/login` unless overridden by environment variables.

## Repository Guide

```text
src/lib/types.ts          Domain types
src/lib/intelligence.ts   Deterministic classification, health, impact, and discovery logic
src/lib/demo.ts           Seed and unit-test fixture only
src/lib/project-repository.ts Authoritative project knowledge repository
src/app/                  Pages and authorized APIs
src/components/           Product workspace UI
prisma/schema.prisma      Active normalized PostgreSQL schema
prisma/migrations/        Checked-in migration history
docs/                     Product and engineering documentation
docs/research/            Competitive research inputs
```

## Documentation

- [Product](docs/product.md): users, positioning, workflows, scope, and measures
- [Architecture](docs/architecture.md): current modules and production target architecture
- [MCP](docs/mcp.md): current read-only HTTP tools and target protocol foundation
- [Development](docs/development.md): local workflow, testing, security, and deployment gates
- [Competitive analysis](docs/research/competitive-analysis.md): researched market context and differentiation

## Production Direction

The target is a modular Next.js application backed by PostgreSQL. Typed artifacts and relationships form the source of truth; Markdown is an interoperable representation. Server-side services enforce workspace isolation, version mutations, calculate or cache health, and create reviewable AI proposals. Provider adapters keep model selection deployment-specific. A separately deployable, read-only MCP surface exposes scoped project context to agents without granting mutation or execution privileges.

See [Architecture](docs/architecture.md) for the target data model, security boundaries, and deployment topology.

## License

No license file is currently present. Treat the repository as all rights reserved until a license is added.
