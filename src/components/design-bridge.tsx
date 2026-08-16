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
        throw new Error("Invalid JSON.");
      }
      const sourceUrl = (parsed as { source?: { url?: string } }).source?.url ?? "";
      const response = await fetch("/api/design-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectKey, payload: parsed, sourceUrl }),
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(body.error ?? "Import failed.");
      setMessage(`Imported to ${body.result.artifactKey} v${body.result.version}.`);
      setPayload("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="eyebrow">Vinyasa integration</div>
      <h1>Design intelligence bridge</h1>
      <p className="subtle">Import design-intelligence payloads from Vinyasa (raw.json or nexora.design-context.json) as a design-context artifact in this project&apos;s knowledge graph.</p>

      {current ? (
        <section className="sheet" style={{ marginTop: 24 }}>
          <h2>Synchronization status</h2>
          <div className="issue"><span className="severity info">ARTIFACT</span><span><strong>{current.artifactKey} · v{current.artifactVersion}</strong><br /><span className="subtle">{current.source} · {current.sourceVersion ?? "no source version"}</span></span></div>
          <div className="issue"><span className="severity info">SOURCE</span><span><strong>{current.externalRef ?? "no URL"}</strong><br /><span className="subtle">Last synchronized {current.synchronizedAt ? new Date(current.synchronizedAt).toLocaleString() : "never"}</span></span></div>
          {current.ctx && (
            <div className="grid-2" style={{ marginTop: 8 }}>
              <section className="sheet"><div className="health-score">{current.ctx.health.overall ?? "–"}</div><p className="subtle">Design health</p><p>{current.ctx.designSystem.colors.length + current.ctx.designSystem.neutralColors.length} colors · {current.ctx.designSystem.fontFamilies.length} fonts · {current.ctx.components.total} components</p></section>
              <section className="sheet"><div className="health-score">{current.ctx.accessibility.critical}</div><p className="subtle">Critical WCAG AA</p><p>{current.ctx.accessibility.pass} pass · {current.ctx.accessibility.warning} warning</p></section>
            </div>
          )}
          <a className="btn" style={{ marginTop: 14 }} href={`/projects/${projectKey}/blueprint?artifact=${current.artifactKey}`}>Open design-context artifact</a>
        </section>
      ) : (
        <section className="sheet" style={{ marginTop: 24 }}><h2>No design context yet</h2><p className="subtle">Import a Vinyasa payload below to create a <span className="mono">DESIGN-001</span> artifact.</p></section>
      )}

      <section className="sheet" style={{ marginTop: 24 }}>
        <h2>Import Vinyasa payload</h2>
        <p className="subtle">In Vinyasa, run a scan, export the ZIP, and copy the contents of <span className="mono">raw.json</span>, or copy the file from “Export for Nexora” (nexora-design-context.json).</p>
        <textarea aria-label="Design payload" value={payload} onChange={(event) => setPayload(event.target.value)} rows={12} placeholder='Paste raw.json or {"schema":"nexora.design-context",...} here...' style={{ width: "100%", border: "1px solid var(--line)", padding: 12, fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 12 }} />
        {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        {message && <p aria-live="polite" className="badge green">{message}</p>}
        <button className="btn btn-primary" onClick={importPayload} disabled={busy || !payload.trim()} style={{ marginTop: 10 }}>{busy ? "Importing..." : "Import design context"}</button>
      </section>
    </main>
  );
}
