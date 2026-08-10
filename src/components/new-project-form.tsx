"use client";
import { useState } from "react";

export function NewProjectForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description") }) });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(body.error ?? "Project creation failed.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Full navigation attaches the session cookie and avoids post-login RSC races.
      window.location.assign(`/projects/${body.key}/overview`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Project creation failed.");
      setBusy(false);
    }
  }
  return (
    <section className="sheet" style={{ marginTop: 32 }}>
      <h2>New project</h2>
      <form onSubmit={submit}>
        <label htmlFor="name" style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 12 }}>Project name</label>
        <input id="name" name="name" type="text" required minLength={2} maxLength={160} style={{ display: "block", width: "100%", height: 40, border: "1px solid var(--line)", padding: "0 10px", marginTop: 6 }} placeholder="e.g. Mobile app onboarding" />
        <label htmlFor="description" style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 12 }}>Description (optional)</label>
        <textarea id="description" name="description" rows={3} maxLength={2000} style={{ display: "block", width: "100%", border: "1px solid var(--line)", padding: 10, marginTop: 6 }} />
        {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn btn-primary" disabled={busy} style={{ marginTop: 12 }}>{busy ? "Creating... " : "Create project"}</button>
      </form>
    </section>
  );
}