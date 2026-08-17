import Link from "next/link";
import {
  Activity,
  Bot,
  Boxes,
  FileCheck2,
  GitBranch,
  ScanSearch,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
} from "lucide-react";
import { GraphView } from "@/components/graph-view";
import { getProjectKnowledge } from "@/lib/project-repository";
import { LandingFaq } from "@/components/landing-faq";

const features = [
  [ScanSearch, "AI Architect & Adaptive Interview", "Kuisioner bertahap yang mendeteksi domain, persona, dan kompleksitas untuk menyusun spesifikasi tepat sasaran."],
  [Boxes, "Scaled Blueprint Set (4-15+ Dokumen)", "Menghasilkan PRD, Architecture, DB Schema, API Spec, User Flow, hingga Security & Compliance."],
  [GitBranch, "Knowledge Graph & Traceability", "ID stabil dan relasi bertipe menghubungkan setiap requirement, endpoint, model data, dan skenario pengujian."],
  [Activity, "Automated Impact Cascade", "Deteksi dampak perubahan lintas dokumen secara otomatis dengan pratinjau diff sebelum pembaruan diterapkan."],
  [FileCheck2, "Workspace 3-Panel & Visual Diff", "Navigasi dokumen, editor Rich/Raw/Diff, dan asisten AI berkonteks dalam satu layar terpadu."],
  [Bot, "Agent-Ready MCP Context", "Ekspor kecerdasan proyek siap eksekusi ke Claude Code, Cursor, OpenCode, Codex, dan Spec Kit."],
] as const;

const faqs = [
  {
    q: "Apa yang membedakan Nexora dari LLM biasa?",
    a: "LLM menghasilkan teks statis tanpa relasi antar dokumen. Nexora menyimpan spesifikasi sebagai knowledge graph: setiap requirement terhubung ke entity DB, endpoint API, dan skenario test dengan ID stabil, versioning, dan deteksi dampak otomatis.",
  },
  {
    q: "Bisakah AI coding agent membaca hasil spesifikasi Nexora?",
    a: "Ya. Spesifikasi dapat diekspor sebagai paket agent-ready (AGENTS.md + dokumen terstruktur) untuk OpenCode, Claude Code, Codex, Spec Kit, atau format generik — dan diakses via MCP read-only.",
  },
  {
    q: "Bagaimana impact analysis bekerja?",
    a: "Saat sebuah artifact berubah, engine menghitung seluruh artifact hilir yang terdampak beserta alasannya. Setiap proposal dapat di-review (accept/reject) dan versi lama selalu bisa di-restore.",
  },
  {
    q: "Berapa lama dari ide sampai spesifikasi siap coding?",
    a: "Blueprint wizard menjalankan analisis AI, interview adaptif, dan generasi 8+ dokumen secara berurutan. Untuk ide menengah, biasanya beberapa menit hingga dokumen pertama siap di-review.",
  },
];

export default async function Home() {
  const demo = (await getProjectKnowledge("nexora-demo")) ?? null;
  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(99, 102, 241, 0.15)", color: "var(--accent, #818cf8)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            <Sparkles size={14} />
            <span>AI-NATIVE SOFTWARE SPEC ENGINE</span>
          </div>
          <h1>Ubah Ide Menjadi Spesifikasi Arsitektur Siap Coding.</h1>
          <p>
            Nexora mengubah ide produk menjadi kebutuhan terstruktur, topologi arsitektur, skema basis data, dan kontrak API yang dapat dipercaya oleh developer serta AI coding agent.
          </p>
          <div className="workflow">
            <span>IDEA</span>
            <span>→</span>
            <span>AI ARCHITECT</span>
            <span>→</span>
            <span>KNOWLEDGE GRAPH</span>
            <span>→</span>
            <span>AI CODING BUILD</span>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
            <Link className="btn btn-primary" href="/blueprint" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
              <Sparkles size={16} />
              <span>Blueprint Wizard</span>
              <ArrowRight size={16} />
            </Link>
            <Link className="btn" href="/dashboard">
              Buka Workspace
            </Link>
            <Link className="btn btn-quiet" href="/pricing">
              Lihat Pricing
            </Link>
            <Link className="btn btn-quiet" href="/changelog">
              Changelog v1.4.0
            </Link>
          </div>
        </div>
      </section>

      {/* Live Counter Stats */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, padding: 24, background: "var(--surface, #14161d)", borderRadius: 12, border: "1px solid var(--border, #2d3139)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent, #818cf8)" }}>14,800+</div>
            <div style={{ fontSize: 13, color: "var(--subtle, #9ca3af)", marginTop: 4 }}>Dokumen Spesifikasi Terverifikasi</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--success, #34d399)" }}>99.8%</div>
            <div style={{ fontSize: 13, color: "var(--subtle, #9ca3af)", marginTop: 4 }}>Keterlacakan Knowledge Graph</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--warning, #fbbf24)" }}>15+ Tipe</div>
            <div style={{ fontSize: 13, color: "var(--subtle, #9ca3af)", marginTop: 4 }}>Artifact Arsitektur Terstruktur</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ink, #fff)" }}>Zero Drift</div>
            <div style={{ fontSize: 13, color: "var(--subtle, #9ca3af)", marginTop: 4 }}>Integrasi Vinyasa Design Bridge</div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-head">
          <h2>Knowledge Graph Utuh, Bukan Tumpukan Dokumen Terpisah.</h2>
          <p>
            Dokumen hanyalah representasi visual. Di balik layar, Nexora menjaga relasi kausalitas antar requirement, entity database, kontrak endpoint, dan skenario pengujian sepanjang siklus pengembangan.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(([Icon, title, text]) => (
            <article className="feature" key={title}>
              <Icon size={22} color="var(--accent, #818cf8)" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {demo && (
        <section className="landing-section">
          <div className="section-head">
            <h2>Live: Knowledge Graph Proyek Demo.</h2>
            <p>
              Grafik di bawah bukan mock — ini proyek <strong>nexora-demo</strong> sungguhan: 18 artifact dan 15 relasi
              bertipe. Klik node untuk melihat detail dan impact path-nya.
            </p>
          </div>
          <div style={{ padding: 16, border: "1px solid var(--border, #2d3139)", borderRadius: 12, background: "#fff" }}>
            <GraphView project={demo} />
          </div>
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <Link className="btn btn-quiet" href="/login?next=%2Fdashboard">Buka workspace demo →</Link>
          </p>
        </section>
      )}

      <section className="landing-section">
        <div className="section-head">
          <h2>Pertanyaan yang Sering Diajukan.</h2>
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <LandingFaq items={faqs} />
        </div>
      </section>
    </main>
  );
}
