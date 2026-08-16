"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function LoginForm({ demoMode = false }: { demoMode?: boolean }) {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        let message = `Login failed (${response.status}).`;
        try {
          const body = await response.json();
          if (body?.error) message = String(body.error);
        } catch {
          // Error body was not valid JSON (or empty): keep the status-based message.
        }
        setError(message);
        setBusy(false);
        return;
      }
      const requested = params.get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
      window.location.assign(destination);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setBusy(false);
    }
  }

  return <form onSubmit={submit}><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue={demoMode ? "architect@nexora.local" : undefined} autoComplete="email" required/><label htmlFor="password">Password</label><input id="password" name="password" type="password" defaultValue={demoMode ? "nexora-production-foundation" : undefined} autoComplete="current-password" minLength={8} required/>{error && <p role="alert" style={{color: "var(--danger)", fontSize: 13}}>{error}</p>}<button className="btn btn-primary" style={{width: "100%"}} disabled={busy}>{busy ? "Signing in..." : "Enter workspace"}</button></form>;
}
