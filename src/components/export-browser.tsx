"use client";
import { useEffect, useState } from "react";
import { Download, PackageOpen } from "lucide-react";

type ExportPreview = { target: string; files: string[]; artifactCount: number };

export function ExportBrowser({ projectKey }: { projectKey: string }) {
  const [target, setTarget] = useState("opencode");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ExportPreview | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/export?project=${encodeURIComponent(projectKey)}&target=${target}&preview=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setPreview(data as ExportPreview);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectKey, target]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/export?project=${encodeURIComponent(projectKey)}&target=${target}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text ? JSON.parse(text).error : "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${projectKey}-${target}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="sheet">
        <PackageOpen size={22} />
        <h2 style={{ marginTop: 22 }}>Agent package</h2>
        <label htmlFor="target" style={{ fontSize: 12, fontWeight: 700 }}>Target workflow</label>
        <select id="target" value={target} onChange={(e) => setTarget(e.target.value)} style={{ display: "block", width: "100%", height: 40, border: "1px solid var(--line)", margin: "8px 0 16px", padding: "0 9px" }}>
          <option value="opencode">OpenCode</option>
          <option value="claude">Claude Code</option>
          <option value="codex">Codex</option>
          <option value="spec-kit">Spec Kit</option>
          <option value="generic">Generic Markdown</option>
        </select>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          <Download size={14} />
          {busy ? "Building ZIP..." : "Download ZIP"}
        </button>
        {error && (
          <p role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </section>
      <section className="sheet">
        <h2>Package contents</h2>
        {preview ? (
          <>
            <p className="subtle">
              {preview.files.length} files from {preview.artifactCount} artifacts. The ZIP is recorded with a SHA-256 checksum (header `X-Nexora-Checksum`).
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
              {preview.files.slice(0, 10).map((file) => (
                <li key={file} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {file}
                </li>
              ))}
              {preview.files.length > 10 && <li className="subtle">+ {preview.files.length - 10} more</li>}
            </ul>
          </>
        ) : (
          <p className="subtle">Loading preview…</p>
        )}
      </section>
    </div>
  );
}
