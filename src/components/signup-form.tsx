"use client";
import { useState } from "react";

export function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), displayName: form.get("displayName") }) });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(body.error ?? "Signup failed.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Full navigation required so the fresh session cookie is attached to the request.
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Signup failed.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor="displayName">Display name</label>
      <input id="displayName" name="displayName" type="text" autoComplete="name" maxLength={120} required />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Creating account... " : "Create workspace"}</button>
    </form>
  );
}