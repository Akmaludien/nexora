# Graph Report - Nexora  (2026-08-15)

## Corpus Check
- 94 files - ~18,703 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 114 nodes (94 code + 20 packages) - 274 edges - 19 areas
- Extraction: 100% EXTRACTED (static import/export parsing) - 0% INFERRED - 0% AMBIGUOUS

## Areas
| Area | Files | Out-edges |
|---|---|---|
| app | 24 | 60 |
| lib | 21 | 51 |
| components | 12 | 31 |
| scripts | 8 | 30 |
| api/auth | 3 | 12 |
| api/ai | 2 | 10 |
| api/artifacts | 2 | 10 |
| api/export | 1 | 10 |
| api/design-context | 2 | 8 |
| root | 8 | 7 |
| api/integration | 2 | 7 |
| prisma | 2 | 6 |
| api/mcp | 1 | 6 |
| api/discovery | 1 | 5 |
| api/impact | 1 | 5 |
| api/members | 1 | 5 |
| api/relationships | 1 | 5 |
| api/projects | 1 | 4 |
| api/health | 1 | 2 |

## God Nodes (most connected)
1. `src/lib/project-repository.ts` - 29 edges (in 26 / out 3)
2. `src/lib/auth.ts` - 23 edges (in 18 / out 5)
3. `src/lib/page-data.ts` - 21 edges (in 17 / out 4)
4. `src/lib/db.ts` - 16 edges (in 15 / out 1)
5. `src/lib/validation.ts` - 16 edges (in 15 / out 1)
6. `src/lib/design-context.ts` - 14 edges (in 10 / out 4)
7. `src/components/project-shell.tsx` - 12 edges (in 10 / out 2)
8. `src/lib/intelligence.ts` - 10 edges (in 9 / out 1)
9. `scripts/test-integration.ts` - 10 edges (in 0 / out 10)
10. `src/app/api/export/route.ts` - 10 edges (in 0 / out 10)
11. `src/lib/types.ts` - 9 edges (in 9 / out 0)
12. `src/components/artifact-list-page.tsx` - 9 edges (in 6 / out 3)
13. `src/components/artifact-workspace.tsx` - 9 edges (in 1 / out 8)
14. `src/lib/discovery-repository.ts` - 8 edges (in 5 / out 3)
15. `prisma/seed.ts` - 7 edges (in 3 / out 4)

## Entry Points
- prisma/seed.ts  [prisma]
- scripts/database.ts  [scripts]
- scripts/mcp-server.ts  [scripts]
- scripts/test-e2e.ts  [scripts]
- scripts/test-integration-http.ts  [scripts]
- scripts/test-integration-roundtrip.ts  [scripts]
- scripts/test-integration.ts  [scripts]
- scripts/test-mcp.ts  [scripts]
- scripts/worker.ts  [scripts]
- src/app/api/ai/jobs/route.ts  [api/ai]
- src/app/api/ai/route.ts  [api/ai]
- src/app/api/artifacts/restore/route.ts  [api/artifacts]
- src/app/api/artifacts/route.ts  [api/artifacts]
- src/app/api/auth/login/route.ts  [api/auth]
- src/app/api/auth/logout/route.ts  [api/auth]
- src/app/api/auth/signup/route.ts  [api/auth]
- src/app/api/design-context/route.ts  [api/design-context]
- src/app/api/discovery/route.ts  [api/discovery]
- src/app/api/export/route.ts  [api/export]
- src/app/api/health/route.ts  [api/health]
- src/app/api/impact/route.ts  [api/impact]
- src/app/api/integration/project/route.ts  [api/integration]
- src/app/api/mcp/route.ts  [api/mcp]
- src/app/api/members/route.ts  [api/members]
- src/app/api/projects/route.ts  [api/projects]
- src/app/api/relationships/route.ts  [api/relationships]
- src/app/dashboard/page.tsx  [app]
- src/app/docs/page.tsx  [app]
- src/app/layout.tsx  [app]
- src/app/login/page.tsx  [app]
- src/app/page.tsx  [app]
- src/app/pricing/page.tsx  [app]
- src/app/projects/[id]/architecture/page.tsx  [app]
- src/app/projects/[id]/blueprint/page.tsx  [app]
- src/app/projects/[id]/database/page.tsx  [app]
- src/app/projects/[id]/decisions/page.tsx  [app]
- src/app/projects/[id]/design/page.tsx  [app]
- src/app/projects/[id]/discovery/page.tsx  [app]
- src/app/projects/[id]/exports/page.tsx  [app]
- src/app/projects/[id]/health/page.tsx  [app]
- src/app/projects/[id]/impact/page.tsx  [app]
- src/app/projects/[id]/knowledge-graph/page.tsx  [app]
- src/app/projects/[id]/layout.tsx  [app]
- src/app/projects/[id]/overview/page.tsx  [app]
- src/app/projects/[id]/requirements/page.tsx  [app]
- src/app/projects/[id]/settings/page.tsx  [app]
- src/app/projects/[id]/testing/page.tsx  [app]
- src/app/projects/[id]/traceability/page.tsx  [app]
- src/app/projects/[id]/user-flow/page.tsx  [app]
- src/app/signup/page.tsx  [app]
- src/proxy.ts  [root]

## Import Cycles
- None detected.

## Surprising Connections
- None detected.

## Integration Subgraph (Vinyasa / Nexora contract)
- 16 files match the integration pattern, 13 internal edges.
  - scripts/test-integration-http.ts
  - scripts/test-integration-roundtrip.ts
  - scripts/test-integration.ts
  - src/app/api/auth/login/route.ts
  - src/app/api/auth/logout/route.ts
  - src/app/api/auth/signup/route.ts
  - src/app/api/design-context/route.test.ts
  - src/app/api/design-context/route.ts
  - src/app/api/integration/project/route.test.ts
  - src/app/api/integration/project/route.ts
  - src/lib/auth.test.ts
  - src/lib/auth.ts
  - src/lib/design-context.test.ts
  - src/lib/design-context.ts
  - src/lib/integration.ts
  - src/proxy.ts

HTTP contract consumed by Vinyasa (nexora-client.ts):
- GET /api/integration/project?project=<key>  <- Bearer NEXORA_INTEGRATION_TOKEN or session
- POST /api/design-context  <- Bearer NEXORA_INTEGRATION_TOKEN (writer roles)

## Changed-File Impact (uncommitted local changes)
### prisma/seed.ts
Imported by (3): `prisma/seed.test.ts`, `scripts/test-integration-roundtrip.ts`, `scripts/test-integration.ts`
Imports (1): `src/lib/demo.ts`

### src/app/api/auth/login/route.ts
Imported by (0): none
Imports (3): `src/lib/auth.ts`, `src/lib/project-repository.ts`, `src/lib/validation.ts`

### scripts/test-integration-http.ts
Imported by (0): none
Imports (0): none

## Unresolved Imports
- None.
