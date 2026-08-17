import Link from "next/link";
import {
  Users,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Bot,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function CommunityPage() {
  const communityChannels = [
    {
      title: "Discord Community",
      description: "Diskusi arsitektur software, pair programming dengan AI agent, dan showcase blueprint.",
      link: "https://discord.gg/nexora",
      cta: "Gabung Discord",
      badge: "Aktif",
    },
    {
      title: "GitHub Discussions & MCP Specs",
      description: "Kontribusi template spesifikasi, feedback protokol MCP stdio, dan issue tracking.",
      link: "https://github.com/Akmaludien/nexora",
      cta: "Buka GitHub",
      badge: "Open Source",
    },
    {
      title: "Live Architecture Office Hours",
      description: "Sesi review spesifikasi mingguan live bersama Principal Architect kami.",
      link: "https://cal.com/nexora/office-hours",
      cta: "Daftar Sesi",
      badge: "Mingguan",
    },
  ];

  const consultationServices = [
    {
      title: "1-on-1 Spec & Architecture Review",
      duration: "45 Menit",
      description: "Bedah mendalam requirement, skema PostgreSQL, endpoint OpenAPI, dan analisis resiko keamanan sebelum tim AI mulai coding.",
      price: "$99 / sesi",
      features: [
        "Review mendalam Knowledge Graph proyek",
        "Validasi skema relasi dan constraint DB",
        "Rekomendasi optimasi prompt AI agent",
        "Laporan tertulis dengan checklist aksi",
      ],
      href: "/signup?plan=starter",
    },
    {
      title: "Enterprise AI Agent Enablement",
      duration: "Program 2 Minggu",
      description: "Pendampingan tim engineering untuk mengadopsi pipeline Nexora + Vinyasa + Claude Code/Cursor secara end-to-end.",
      price: "Kustom",
      features: [
        "Setup private MCP Server di infrastruktur perusahaan",
        "Integrasi Design Bridge dengan Design System internal",
        "Pelatihan prompt-engineering untuk software architect",
        "Dedicated SLA & support channel",
      ],
      href: "/signup?plan=enterprise",
    },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg, #0b0c10)", color: "var(--ink, #f3f4f6)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Back Link */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/" className="btn btn-quiet" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ArrowLeft size={14} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent, #818cf8)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            <Users size={14} />
            <span>Komunitas & Konsultasi Ahli</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5 }}>
            Bangun Software Lebih Cepat Bersama Komunitas AI Architect
          </h1>
          <p style={{ color: "var(--subtle, #9ca3af)", fontSize: 16, maxWidth: 640, margin: "0 auto" }}>
            Terhubung dengan sesama arsitek software, dapatkan review spesifikasi dari praktisi berpengalaman, dan maksimalkan produktivitas AI coding agent.
          </p>
        </div>

        {/* Community Channels */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>Kanal Komunitas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {communityChannels.map((c) => (
              <div
                key={c.title}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: "1px solid var(--border, #2d3139)",
                  background: "var(--surface, #14161d)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{c.title}</h3>
                  <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent, #818cf8)", borderRadius: 10, fontWeight: 600 }}>
                    {c.badge}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--subtle, #9ca3af)", lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                  {c.description}
                </p>
                <a
                  href={c.link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-quiet"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}
                >
                  <span>{c.cta}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Consultation Services */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>Layanan Konsultasi Arsitektur</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {consultationServices.map((svc) => (
              <div
                key={svc.title}
                style={{
                  padding: 28,
                  borderRadius: 12,
                  border: "1px solid var(--border, #2d3139)",
                  background: "var(--surface, #14161d)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{svc.title}</h3>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent, #818cf8)" }}>{svc.price}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--subtle, #9ca3af)", marginBottom: 16 }}>
                  Durasi: {svc.duration}
                </div>
                <p style={{ fontSize: 14, color: "var(--ink, #d1d5db)", lineHeight: 1.5, marginBottom: 24 }}>
                  {svc.description}
                </p>

                <div style={{ borderTop: "1px solid var(--border, #2d3139)", paddingTop: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink, #e5e7eb)", marginBottom: 12, textTransform: "uppercase" }}>
                    Termasuk:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {svc.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink, #d1d5db)" }}>
                        <CheckCircle size={15} color="var(--success, #10b981)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={svc.href}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 14, fontWeight: 600, marginTop: "auto" }}
                >
                  <Calendar size={16} />
                  <span>Jadwalkan Konsultasi</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
