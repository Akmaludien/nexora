# Graph Report - Nexora  (2026-08-10)

## Corpus Check
- 64 files · ~13,453 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 328 nodes · 472 edges · 26 communities (19 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- devDependencies
- Nexora MCP Foundation
- intelligence.ts
- compilerOptions
- Nexora Development
- dependencies
- Nexora Product
- Nexora Architecture
- scripts
- Database Architecture
- Nexora
- Nexora Competitive Analysis
- include
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- proxy.ts
- login/page.tsx
- app/layout.tsx
- app/page.tsx

## God Nodes (most connected - your core abstractions)
1. `demoProject` - 16 edges
2. `compilerOptions` - 16 edges
3. `calculateHealth()` - 14 edges
4. `Nexora Development` - 13 edges
5. `verifySession()` - 12 edges
6. `Nexora MCP Foundation` - 12 edges
7. `canAccessProject()` - 11 edges
8. `hasSameOrigin()` - 11 edges
9. `Nexora Product` - 11 edges
10. `analyzeImpact()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `hasSameOrigin()`  [EXTRACTED]
  src/app/api/auth/logout/route.ts → src/lib/auth.ts
- `GET()` --calls--> `canAccessProject()`  [EXTRACTED]
  src/app/api/export/route.ts → src/lib/auth.ts
- `GET()` --calls--> `verifySession()`  [EXTRACTED]
  src/app/api/export/route.ts → src/lib/auth.ts
- `POST()` --calls--> `executeMcpTool()`  [EXTRACTED]
  src/app/api/mcp/route.ts → src/lib/mcp.ts
- `Dashboard()` --calls--> `calculateHealth()`  [EXTRACTED]
  src/app/dashboard/page.tsx → src/lib/intelligence.ts

## Import Cycles
- None detected.

## Communities (26 total, 7 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, eslint, eslint-config-next, @eslint/eslintrc (+19 more)

### Community 1 - "Nexora MCP Foundation"
Cohesion: 0.17
Nodes (12): Authentication and Authorization Target, Design Rules, Launch Criteria, Nexora MCP Foundation, Proposed Read-Only Tools, Proposed Resources, Purpose, Request and Response Safety (+4 more)

### Community 2 - "intelligence.ts"
Cohesion: 0.10
Nodes (26): GET(), Dashboard(), HealthPage(), Overview(), ArtifactWorkspace(), ImpactReview(), AIProvider, AIRequest (+18 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next-build/dev/types/**/*.ts, .next-build/types/**/*.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+21 more)

### Community 4 - "Nexora Development"
Cohesion: 0.11
Nodes (18): AI and MCP tests, AI Provider Development Target, Code Organization, Current State, Database Workflow Target, Deployment Checklist, Development Commands, Domain Invariants (+10 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (28): lucide-react, next, dependencies, lucide-react, next, react, react-dom, react-markdown (+20 more)

### Community 6 - "Nexora Product"
Cohesion: 0.12
Nodes (16): Agent and ecosystem, Core Workflow Target, Current demonstration, Differentiation, Explicit Non-Goals for the First Release, Foundation, Health Semantics, Intelligence (+8 more)

### Community 7 - "Nexora Architecture"
Cohesion: 0.14
Nodes (14): Architecture Decisions Still Open, Consistency and Jobs, Current Architecture, Demo and export, Dependency direction, Deployment Target, Domain model, Intelligence (+6 more)

### Community 8 - "scripts"
Cohesion: 0.17
Nodes (21): isRateLimited(), POST(), requests, GET(), PATCH(), versions, POST(), POST() (+13 more)

### Community 9 - "Database Architecture"
Cohesion: 0.20
Nodes (9): AI and impact review, Core ownership, Database Architecture, Deletion and retention, Exports and integrations, Index and constraint strategy, JSON policy, Project knowledge graph (+1 more)

### Community 10 - "Nexora"
Cohesion: 0.09
Nodes (19): Competitive Analysis, Competitive Feature Matrix, Gaps and Opportunities, GitHub Spec Kit, Nexora Competitive Analysis, Nexora Differentiation Strategy, Ngoding Pake AI, Scope and Method (+11 more)

### Community 11 - "Nexora Competitive Analysis"
Cohesion: 0.12
Nodes (10): columns, Discovery(), questions, ExportBody, ExportBrowser(), colors, GraphView(), links (+2 more)

### Community 18 - "proxy.ts"
Cohesion: 0.60
Nodes (4): config, decodeBase64Url(), isValidSession(), proxy()

## Knowledge Gaps
- **149 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Nexora Development` connect `Nexora Development` to `Nexora`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Nexora Product` connect `Nexora Product` to `Nexora`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `intelligence.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09663120567375887 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._