import Link from "next/link";
import { Activity, Bot, Boxes, FileCheck2, GitBranch, ScanSearch } from "lucide-react";

const features = [
  [ScanSearch, "Adaptive discovery", "Questions respond to what is still unknown and stop when confidence is sufficient."],
  [Boxes, "Structured blueprint", "Complexity determines the right artifacts, from requirements through architecture and tests."],
  [GitBranch, "Knowledge graph", "Stable IDs and typed relationships make every requirement, endpoint, entity, task, and test traceable."],
  [Activity, "Explainable impact", "See what a change affects, follow the path, and review proposals before anything is updated."],
  [FileCheck2, "Specification health", "Continuously inspect completeness, consistency, coverage, ambiguity, and architecture integrity."],
  [Bot, "Agent-ready context", "Export bounded project intelligence to OpenCode, Claude Code, Codex, Spec Kit, or MCP clients."],
] as const;

export default function Home() {
  return <main><section className="hero"><div className="hero-inner"><div className="eyebrow">Product intelligence for software teams</div><h1>From idea to executable specification.</h1><p>Nexora turns product intent into connected requirements, architecture, decisions, tests, and implementation work that humans and AI coding agents can trust.</p><div className="workflow"><span>IDEA</span><span>→</span><span>SPEC</span><span>→</span><span>ARCHITECTURE</span><span>→</span><span>BUILD</span></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="btn btn-primary" href="/dashboard">Open demo workspace</Link><Link className="btn" href="/docs">Read the architecture</Link></div></div></section><section className="landing-section"><div className="section-head"><h2>Project knowledge, not a pile of documents.</h2><p>Documents are interoperable views. Underneath them, Nexora maintains the relationships that explain coverage, change, and implementation order throughout a project’s life.</p></div><div className="feature-grid">{features.map(([Icon,title,text])=><article className="feature" key={title}><Icon size={22}/><h3>{title}</h3><p>{text}</p></article>)}</div></section></main>;
}
