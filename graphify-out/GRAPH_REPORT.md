# Graph Report - Nexora  (2026-08-10)

## Corpus Check
- 78 files · ~15,833 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 426 nodes · 762 edges · 26 communities (19 shown, 7 thin omitted)
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
- [id]/layout.tsx

## God Nodes (most connected - your core abstractions)
1. `getAuthorizedProject()` - 32 edges
2. `authorizeProject()` - 26 edges
3. `hasSameOrigin()` - 23 edges
4. `main()` - 18 edges
5. `getProjectKnowledge()` - 17 edges
6. `compilerOptions` - 16 edges
7. `scripts` - 15 edges
8. `calculateHealth()` - 14 edges
9. `Nexora Development` - 13 edges
10. `Nexora MCP Foundation` - 12 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `getDiscoveryState()`  [EXTRACTED]
  scripts/test-integration.ts → src/lib/discovery-repository.ts
- `main()` --calls--> `getOrCreateImpactProposal()`  [EXTRACTED]
  scripts/test-integration.ts → src/lib/impact-repository.ts
- `main()` --calls--> `reviewAllImpactItems()`  [EXTRACTED]
  scripts/test-integration.ts → src/lib/impact-repository.ts
- `main()` --calls--> `getProjectKnowledge()`  [EXTRACTED]
  scripts/test-integration.ts → src/lib/project-repository.ts
- `main()` --calls--> `incrementRateLimit()`  [EXTRACTED]
  scripts/test-integration.ts → src/lib/project-repository.ts

## Import Cycles
- None detected.

## Communities (26 total, 7 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.05
Nodes (39): embedded-postgres, eslint, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, embedded-postgres, eslint (+31 more)

### Community 1 - "Nexora MCP Foundation"
Cohesion: 0.11
Nodes (18): name, private, scripts, build, db:dev, db:generate, db:migrate, db:seed (+10 more)

### Community 2 - "intelligence.ts"
Cohesion: 0.07
Nodes (39): artifactTypes, prisma, relationshipTypes, POST(), POST(), Dashboard(), Blueprint(), HealthPage() (+31 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next-build/dev/types/**/*.ts, .next-build/types/**/*.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+21 more)

### Community 4 - "Nexora Development"
Cohesion: 0.11
Nodes (18): AI and MCP tests, AI Provider Development Target, Code Organization, Current State, Database Workflow, Deployment Checklist, Development Commands, Domain Invariants (+10 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (27): bcryptjs, jszip, lucide-react, next, dependencies, bcryptjs, jszip, lucide-react (+19 more)

### Community 6 - "Nexora Product"
Cohesion: 0.12
Nodes (16): Agent and ecosystem, Core Workflow Target, Current demonstration, Differentiation, Explicit Non-Goals for the First Release, Foundation, Health Semantics, Intelligence (+8 more)

### Community 7 - "Nexora Architecture"
Cohesion: 0.14
Nodes (14): Architecture Decisions Still Open, Consistency and Jobs, Current Architecture, Demo and export, Dependency direction, Deployment Target, Domain model, Intelligence (+6 more)

### Community 8 - "scripts"
Cohesion: 0.09
Nodes (46): seed(), check(), main(), POST(), apiError(), DELETE(), GET(), PATCH() (+38 more)

### Community 9 - "Database Architecture"
Cohesion: 0.20
Nodes (9): AI and impact review, Core ownership, Database Architecture, Deletion and retention, Exports and integrations, Index and constraint strategy, JSON policy, Project knowledge graph (+1 more)

### Community 10 - "Nexora"
Cohesion: 0.06
Nodes (31): Competitive Analysis, Authentication and Authorization Target, Design Rules, Launch Criteria, Nexora MCP Foundation, Proposed Read-Only Tools, Proposed Resources, Purpose (+23 more)

### Community 11 - "Nexora Competitive Analysis"
Cohesion: 0.09
Nodes (26): GET(), Page(), Page(), Page(), DiscoveryPage(), GraphPage(), ProjectLayout(), Overview() (+18 more)

### Community 12 - "include"
Cohesion: 0.23
Nodes (11): GET(), POST(), writers, ImpactPage(), ImpactReview(), Proposal, createImpactProposal(), getOrCreateImpactProposal() (+3 more)

### Community 24 - "[id]/layout.tsx"
Cohesion: 0.60
Nodes (5): check(), json(), login(), main(), origin

## Knowledge Gaps
- **179 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `Nexora MCP Foundation`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `GET()` connect `dependencies` to `scripts`, `intelligence.ts`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Nexora MCP Foundation` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `intelligence.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07231638418079096 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._