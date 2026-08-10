# Nexora Product

## Product Thesis

Nexora is intended to be a project intelligence system for software delivery. Its source of truth is a graph of stable, typed artifacts and explicit relationships. Markdown remains a portable editing and export format, but isolated documents are not the underlying product model.

The product should help teams answer:

- What are we building, why, and for whom?
- Is the specification complete enough for its complexity?
- Which requirements are implemented and validated?
- What else may change when an artifact changes, and why?
- Which decisions constrain implementation?
- What bounded context should a coding agent receive?

## Product Status

### Current demonstration

The repository currently proves a narrow domain concept through local TypeScript data and functions:

- A fixed sample project with typed artifacts and edges
- Rule-based complexity classification
- Rule-based health and issue calculation
- Breadth-first relationship impact traversal
- Discovery-field completeness calculation
- Construction of an in-memory, Markdown-oriented agent export

There is no usable product interface, persistent user project, collaboration, AI generation, version workflow, integration, billing, or hosted service yet. The Orbit Workspace artifacts describe a fictional project; they are sample data rather than Nexora's own implemented production architecture.

### Target product

The production product is envisioned as four connected systems:

1. **Project Knowledge Graph:** normalized artifacts and typed, reasoned relationships.
2. **Specification Intelligence:** complexity-aware coverage, consistency, traceability, architecture, and testing checks.
3. **Impact and Change Review:** explainable paths and proposed downstream changes that users can review, apply, or reject.
4. **Agent Context Delivery:** interoperable exports and read-only MCP access scoped to a project and task.

## Users and Jobs

| User | Primary job |
|---|---|
| Founder or product lead | Turn intent into a sufficiently complete, understandable delivery specification |
| Product manager | Maintain requirements, stories, rules, milestones, and decisions as the product evolves |
| Engineer or architect | Inspect contracts, dependencies, architecture constraints, and expected tests before implementation |
| Designer | Contribute stable design context without making a design tool the product's source of truth |
| Delivery lead | See gaps, risk, ownership, and traceability across a project or portfolio |
| Coding agent | Retrieve bounded, current, authorized context with stable identifiers |

## Core Workflow Target

1. **Discover:** capture goals, users, problem, journey, features, data, authentication, scale, and deployment assumptions.
2. **Classify:** estimate project complexity and select an appropriate artifact set. The current classifier is deterministic and should remain explainable even if future AI assists discovery.
3. **Structure:** create artifacts with stable keys and typed relationships rather than generating disconnected documents.
4. **Validate:** calculate health, show actionable issues, and trace requirements through implementation and tests.
5. **Evolve:** version edits and decisions, calculate impact paths, and present downstream changes as reviewable proposals.
6. **Deliver:** export repository context or expose authorized read-only context through MCP.

## Product Principles

- Relationships are first-class data and include a reason.
- Stable IDs survive wording and title changes.
- Health is explainable; a score without contributing evidence is not sufficient.
- AI proposes and explains. Users control changes to validated knowledge.
- Complexity changes expected documentation depth, not product quality.
- Product and engineering views operate over the same entities.
- Agent access is minimal, scoped, observable, and read-only by default.
- Provider and repository interoperability reduce lock-in.

## Health Semantics

The current health report averages five equally weighted dimensions:

- **Completeness:** presence of artifact types required by the selected complexity.
- **Consistency:** deductions for current critical and warning issues.
- **Traceability:** proportion of artifacts appearing in at least one relationship endpoint.
- **Architecture:** full score for simple projects or when architecture, API, and database artifacts all exist; otherwise a fixed partial score.
- **Testing:** requirements targeted by a `validates` relationship.

This is demonstration logic, not a production quality guarantee. It does not inspect Markdown semantics, validate relationship direction, assess whether tests are implemented, or incorporate AI judgment. Production UI must disclose the rules and evidence behind every score.

## Scope Priorities

### Foundation

- Authentication, workspaces, projects, and server-side isolation
- Persistent artifacts, immutable revisions, and relationships
- Artifact and relationship editing with runtime validation
- Deterministic health and explainable issue details
- Repository export download with stable IDs

### Intelligence

- Guided discovery and complexity recommendations
- Requirement-to-feature/task/test traceability views
- Version diffs and impact paths
- AI-generated change proposals with review, concurrency checks, and audit history
- Provider usage limits and operational controls

### Agent and ecosystem

- Read-only MCP resources and tools
- Scoped credentials and auditability
- Repository integrations only after export contracts stabilize
- Versioned Design Context bridge for an independent design system such as Vinyasa

Portfolio analytics, broad automation, autonomous mutation, and marketplace features should follow evidence of strong project-level retention and data quality.

## Differentiation

Competitive research identifies a consistent gap between accessible idea-to-plan tools, document-oriented web architects, and repository-native specification workflows. Nexora's intended distinction is continuous graph-backed intelligence: item-level lineage, requirement-to-test traceability, explicit decisions, explainable impact proposals, and safe agent context.

Nexora should not reproduce competitor branding, language, or layouts. See [competitive analysis](research/competitive-analysis.md) for the research basis and dated source scope.

## Success Measures

Early product measures should test whether structured intelligence improves delivery rather than only measuring generated document volume:

- Time from project creation to a reviewable baseline
- Percentage of non-PRD artifacts connected to the graph
- Percentage of requirements with acceptance criteria and validating tests
- Critical issue resolution rate and time
- Percentage of impact proposals reviewed, accepted, edited, or rejected
- Export/MCP context use followed by linked implementation outcomes
- Weekly returning projects after their initial specification is created
- Cross-workspace authorization incidents, target zero
- AI proposal error rate, cost per completed workflow, and provider latency

## Explicit Non-Goals for the First Release

- Replacing source control, issue trackers, design tools, or coding agents
- Executing arbitrary code or shell commands through MCP
- Giving an AI provider direct database or unrestricted workspace access
- Silently propagating AI changes into validated artifacts
- Claiming that a health score proves correctness, security, or delivery readiness
- Building a graph database before PostgreSQL relationship queries show a measured limitation
