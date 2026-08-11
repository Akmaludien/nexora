# Nexora Integration Contracts

This document defines the stable, versioned contracts between Nexora and Vinyasa
(and, later, the Build Pack layer). It also documents the single canonical
`project_id` relationship and how both products remain independently operable.

## Product Boundary

- **Nexora = Product Intelligence**: IDEA → PRD → requirements → features →
  user flows → page/screen requirements → acceptance criteria → architecture →
  implementation context.
- **Vinyasa = Design Intelligence**: visual language, layout, components, pages,
  interactions, responsive rules, accessibility, assets.

Nexora does **not** scan visuals or extract design tokens. Vinyasa does **not**
own product specification. They exchange contracts only.

## Canonical `project_id`

There is exactly one canonical external project identifier across the integration
boundary:

```text
project_id == Nexora project.key
```

- Nexora generates it (lowercase `[a-z0-9]{1}[-a-z0-9]{1,38}`) when a project is
  created.
- Vinyasa references it when calling Nexora.
- The Design Context and versioning use the same `project_id`.
- API routes validate it (`projectKeySchema`) and every access is authorized
  against membership **before** any read or write.

The internal PostgreSQL `Project.id` (a UUID) is **never** exposed across the
integration boundary; it is used only inside each request after authorization.

## NEXORA → VINYASA: Product Context Contract

`GET /api/integration/project?project=<project_id>`

Authenticated by a browser session **or** the shared `NEXORA_INTEGRATION_TOKEN`
Bearer header. Returns a versioned, deterministic contract:

```jsonc
{
  "schema_version": "1.0",
  "project_id": "<project.key>",
  "project": {
    "key": "<project.key>",
    "name": "...",
    "description": "...",
    "complexity": "LARGE",
    "completeness": 89
  },
  "product": {
    "prd":           [{ "id", "title", "content", "version", "status", "acceptanceCriteria", "milestone" }],
    "requirements":  [...],
    "features":      [...],
    "userStories":   [...],
    "userFlows":     [...],
    "businessRules": [...],
    "architecture":  [...],
    "decisions":     [...],
    "api":           [...],
    "database":      [...]
  },
  "relationships": [{ "id", "sourceId", "targetId", "type", "reason" }],
  "design": { /* the active Design Context, if any — see below */ }
}
```

This gives Vinyasa everything it needs to derive product pages, screens, design
priorities, and constraints — no copy/paste of a PRD required. It is a single
round trip and deterministic for a given project.

## VINYASA → NEXORA: Design Context Contract

`GET /api/design-context?project=<project_id>` (read) and
`POST /api/design-context` (import).

Nexora stores the received design intelligence as a **structured Design Context**
in the `DesignContext` table, backed by a `DESIGN-001` artifact. Nexora does not
reinterpret visual tokens; Vinyasa owns that. Whatever structured design data
Vinyasa sends is preserved verbatim in the `design` block.

Canonical payload (`schema: "nexora.design-context"`):

```jsonc
{
  "schema": "nexora.design-context",
  "version": 1,
  "generatedBy": "vinyasa 0.4.0",
  "sourceVersion": "1.0.0",
  "sourceUrl": "https://shop.example/",
  "sourceTitle": "Shop",
  "generatedAt": "…",
  "designSystem": {
    "colors":        [{ "name", "hex", "usage" }],
    "neutralColors": [{ "name", "hex", "usage" }],
    "fontFamilies":  ["…"],
    "fontSizes":     [{ "value", "px" }],
    "spacing":       [{ "value", "px" }],
    "radius":        [{ "value", "px" }]
  },
  "health":       { "overall": 91 },
  "accessibility": { "critical": 0, "warning": 2, "pass": 8 },
  "components":    { "total": 3 },
  "design": {
    "pages":               [{ "path", "name" }],
    "components":          [{ "id", "variants" }],
    "interactions":        [{ "element", "action", "effect" }],
    "responsiveRules":     [{ "breakpoint", "columns" }],
    "assets":              [{ "name", "kind" }],
    "implementationHints": { "framework", "styling" },
    "accessibilityRules":  [],
    "layout":              {},
    "visualLanguage":      {}
  }
}
```

The `design` block is **preserved as supplied** — Nexora stores it without loss so
it can round-trip back to Vinyasa or feed the future Build Pack.

## Versioning

Nexora keeps project and design versioning separate:

```text
Project
 ├── Product versions   → Artifact.version chain on each product artifact
 └── Design versions    → ArtifactVersion chain on the DESIGN-001 artifact
                            + the active DesignContext row (latest payload)
```

Importing the **same** payload (identical checksum) is a **no-op** — it returns
`200` with `result.duplicate: true` and does not bump the version. A **changed**
payload creates a new design version and advances the active Design Context
(`201`). Old design versions are preserved as artifact revisions; history is not
destroyed.

## Error Handling / Integration State

Nexora and Vinyasa are **integrations, not hard dependencies**. Each remains
fully functional if the other is unavailable.

Representable states:

```text
not_connected   → no Design Context and no integration used yet
connected       → project readable via the integration token/session
syncing         → import in progress
synced          → design context persisted and returned
pending         → awaiting import
failed          → import rejected (status 400/403/422/500)
```

Nexora never returns HTTP success unless the Design Context was actually
persisted. If Vinyasa is unreachable, the core workflow below still works:

```text
USER IDEA → NEXORA → PRODUCT SPECIFICATION → IMPLEMENTATION CONTEXT
```

## Authorization

Every integration endpoint:

- validates `project_id` with `projectKeySchema`;
- resolves the caller to a browser session **or** the `NEXORA_INTEGRATION_TOKEN`
  Bearer token (`authorizeProjectRequest`);
- enforces project membership **before** any access;
- rejects cross-project writes and arbitrary project IDs.

The `NEXORA_INTEGRATION_TOKEN` must match in both Nexora and Vinyasa. When empty,
programmatic (non-session) access is disabled.

## Build Pack Readiness

Nexora exposes a clean **Product Pack**:

- project metadata
- Product Context (`schema_version`, `project_id`, `project`, `product`)
- requirements, features, user flows, pages, acceptance criteria
- architecture, implementation plan, design brief, project constraints

This will later merge with the **Vinyasa Design Pack** into an
**Implementation Build Pack**. The two schemas are intentionally kept separate;
Nexora does not prematurely merge Design Context into Product Context.

## Local development

1. `Copy-Item .env.example .env.local` (PowerShell).
2. `npm run db:dev` → persistent local PostgreSQL.
3. `npm run db:migrate && npm run db:seed`.
4. Send a Vinyasa-style payload to `/api/design-context`, or use a browser
   session on the Design Bridge page.

For the server-to-server path, set `NEXORA_INTEGRATION_TOKEN` in both products
and call `/api/integration/project?project=<project_id>` with
`Authorization: Bearer <token>`.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL connection string |
| `AUTH_SECRET` | Session/signup gate (required in production for signup) |
| `NEXORA_INTEGRATION_TOKEN` | Shared Vinyasa ↔ Nexora Bearer token (empty = disabled) |
| `NEXORA_MCP_TOKEN` | Optional token for the stdio MCP server (empty = local trust mode) |
| `AI_PROVIDER` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI provider (mock by default) |
| `COOKIE_SECURE` | Force `Secure` cookie flag (default via protocol detection) |

Never prefix secrets with `NEXT_PUBLIC_`.

## Test commands

```bash
npm test                    # Vitest unit tests (jsdom, no DB)
npm run typecheck           # TypeScript
npm run lint                # ESLint
npm run test:integration    # PostgreSQL persistence + design bridge (requires DB)
npm run test:roundtrip      # Nexora ↔ Vinyasa round-trip (requires DB)
npm run test:mcp            # MCP protocol server (requires DB)
npm run test:e2e            # HTTP production-flow (app on port 3421)
npm run test:e2e-browser    # Playwright browser (build + DB + port 3200)
```