import Link from "next/link";

const sections = [
  {
    id: "concepts",
    title: "Core model",
    body: (
      <>
        <p>
          Every project is a graph of <strong>artifacts</strong>: PRDs, requirements, features, user stories,
          business rules, user flows, APIs, database schemas, architecture notes, security notes, testing plans,
          roadmaps, tasks, decisions, and design context. Each artifact has a stable key (e.g.{" "}
          <code>REQ-001</code>), an immutable version history, and a lifecycle status.
        </p>
        <p>
          Artifacts are connected by <strong>typed relationships</strong> — depends_on, implements, affects,
          requires, maps_to, validates, derived_from — each carrying a human-readable reason. The health and impact
          engines derive their findings from this graph, so a change is only ever as surprising as its edges.
        </p>
      </>
    ),
  },
  {
    id: "workflow",
    title: "Workflow",
    body: (
      <ol>
        <li>
          <Link href="/blueprint">Start from an idea</Link>. The wizard analyzes the concept, runs an adaptive
          interview, recommends a stack, and generates a full blueprint (8 documents + relationships).
        </li>
        <li>The generated project lands in the <Link href="/dashboard">dashboard</Link> as a real workspace.</li>
        <li>
          Explore the <strong>knowledge graph</strong> — nodes are artifacts, edges are relationships. Click a node
          for detail, or pick a source to highlight its downstream impact path.
        </li>
        <li>
          Change an artifact, then run <strong>impact analysis</strong>. Nexora computes every downstream artifact
          affected, with a reason and proposed content. Review each item: accept to apply (version bump + mutation
          record) or reject.
        </li>
        <li>
          Check the <strong>traceability matrix</strong> — requirements mapped to features, APIs, and tests, with
          coverage percentage and gaps surfaced.
        </li>
        <li>
          When ready, export an <strong>agent package</strong> for OpenCode, Claude Code, Codex, Spec Kit, or
          generic Markdown.
        </li>
      </ol>
    ),
  },
  {
    id: "mcp",
    title: "Agent access (MCP)",
    body: (
      <>
        <p>
          Agents can read a project through a bounded, <strong>read-only</strong> tool surface. There is no
          unrestricted execution: tools only return project knowledge, never write.
        </p>
        <p>
          Discover the tool list with <code>GET /api/mcp</code>, then call a tool with{" "}
          <code>POST /api/mcp</code>:
        </p>
        <pre style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, overflowX: "auto", fontSize: 13 }}>
          {`{
  "projectKey": "my-project",
  "tool": "get_impact_analysis",
  "arguments": { "artifactId": "REQ-001" }
}`}
        </pre>
        <p>Available tools:</p>
        <ul>
          <li><code>get_project_context</code> — name, description, complexity</li>
          <li><code>get_requirements</code> / <code>get_tasks</code> / <code>get_decisions</code></li>
          <li><code>get_architecture</code> / <code>get_api_spec</code> / <code>get_database_schema</code></li>
          <li><code>get_feature</code> (by id) / <code>get_design_context</code></li>
          <li><code>get_spec_health</code> — completeness, consistency, traceability scores</li>
          <li><code>get_impact_analysis</code> — downstream impact of one artifact</li>
          <li><code>search_project_knowledge</code> — keyword search across titles and content</li>
        </ul>
        <p>
          All calls require an authenticated session (or the integration token) and are rate-limited (60/min per
          user per project).
        </p>
      </>
    ),
  },
  {
    id: "api",
    title: "API surface",
    body: (
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)" }}>Endpoint</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)" }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["POST /api/blueprint", "analyze, questions, interview, stack, generate"],
            ["GET/PATCH /api/artifacts", "read artifact + versions, save (version bump)"],
            ["GET/POST /api/impact", "impact analysis + review (accept/reject)"],
            ["GET /api/export", "build agent ZIP, or ?preview=1 for file list"],
            ["GET/POST /api/mcp", "read-only agent tool surface"],
            ["GET /api/relationships", "typed relationship list"],
          ].map(([ep, purpose]) => (
            <tr key={ep}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{ep}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)" }}>{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
];

export default function DocsPage() {
  return (
    <main className="page">
      <div className="eyebrow">Documentation</div>
      <h1>Specification intelligence as a system.</h1>
      <p className="subtle">
        Nexora turns a product idea into a versioned, traceable specification graph — readable by humans and by
        agents.
      </p>
      <div style={{ display: "grid", gap: 22, marginTop: 28 }}>
        {sections.map((section) => (
          <section className="sheet" key={section.id}>
            <h2>{section.title}</h2>
            {section.body}
          </section>
        ))}
      </div>
      <p style={{ marginTop: 28 }}>
        <Link className="btn btn-primary" href="/dashboard">
          Explore the demo
        </Link>
      </p>
    </main>
  );
}
