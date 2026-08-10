"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NexoraDesignContext } from "@/lib/design-context";

type DesignState = {
  design: {
    id: string;
    source: string;
    externalRef: string | null;
    sourceVersion: string | null;
    checksum: string | null;
    synchronizedAt: string | null;
    artifactKey: string;
    artifactVersion: number;
    ctx: NexoraDesignContext | null;
  } | null;
};

export function DesignBridge({ projectKey, initial }: { projectKey: string; initial: DesignState }) {
  const router = useRouter();
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const current = initial.design;

  async function importPayload() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new Error("JSON tidak valid.");
      }
      const sourceUrl = (parsed as { source?: { url?: string } }).source?.url ?? "";
      const response = await fetch("/api/design-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectKey, payload: parsed, sourceUrl }),
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(body.error ?? "Import gagal.");
      setMessage(`Diiimport ke ${body.result.artifactKey} v${body.result.version}.`);
      setPayload("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="eyebrow">Vinyasa integration</div>
      <h1>Design intelligence bridge</h1>
      <p className="subtle">Impor payload design intelligence dari Vinyasa (raw.json atau nexora.design-context.json) menjadi artifact design-context di project knowledge ini.</p>

      {current ? (
        <section className="sheet" style={{ marginTop: 24 }}>
          <h2>Status tersinkronisasi</h2>
          <div className="issue"><span className="severity info">ARTIFACT</span><span><strong>{current.artifactKey} · v{current.artifactVersion}</strong><br /><span className="subtle">{current.source} · {current.sourceVersion ?? "tidak ada versi sumber"}</span></span></div>
          <div className="issue"><span className="severity info">SUMBER</span><span><strong>{current.externalRef ?? "tidak ada URL"}</strong><br /><span className="subtle">Terakhir disinkronkan {current.synchronizedAt ? new Date(current.synchronizedAt).toLocaleString() : "belum pernah"}</span></span></div>
          {current.ctx && (
            <div className="grid-2" style={{ marginTop: 8 }}>
              <section className="sheet"><div className="health-score">{current.ctx.health.overall ?? "–"}</div><p className="subtle">Design health</p><p>{current.ctx.designSystem.colors.length + current.ctx.designSystem.neutralColors.length} warna · {current.ctx.designSystem.fontFamilies.length} font · {current.ctx.components.total} komponen</p></section>
              <section className="sheet"><div className="health-score">{current.ctx.accessibility.critical}</div><p className="subtle">Critical WCAG AA</p><p>{current.ctx.accessibility.pass} pass · {current.ctx.accessibility.warning} warning</p></section>
            </div>
          )}
          <a className="btn" style={{ marginTop: 14 }} href={`/projects/${projectKey}/blueprint?artifact=${current.artifactKey}`}>Buka artifact design-context</a>
        </section>
      ) : (
        <section className="sheet" style={{ marginTop: 24 }}><h2>Belum ada design context</h2><p className="subtle">Impor payload Vinyasa di bawah untuk membuat artifact <span className="mono">DESIGN-001</span>.</p></section>
      )}

      <section className="sheet" style={{ marginTop: 24 }}>
        <h2>Impor payload Vinyasa</h2>
        <p className="subtle">Di Vinyasa, jalankan scan lalu gunakan export ZIP dan salin isi <span className="mono">raw.json</span>, atau salin berkas hasil “Ekspor untuk Nexora” (nexora-design-context.json).</p>
        <textarea aria-label="Design payload" value={payload} onChange={(event) => setPayload(event.target.value)} rows={12} placeholder='Paste raw.json atau {"schema":"nexora.design-context",...} di sini...' style={{ width: "100%", border: "1px solid var(--line)", padding: 12, fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 12 }} />
        {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        {message && <p aria-live="polite" className="badge green">{message}</p>}
        <button className="btn btn-primary" onClick={importPayload} disabled={busy || !payload.trim()} style={{ marginTop: 10 }}>{busy ? "Mengimpor..." : "Impor design context"}</button>
      </section>
    </main>
  );
}