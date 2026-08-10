"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; role: "OWNER" | "EDITOR" | "VIEWER"; user: { email: string; displayName: string | null } };

export function MemberManagement({ projectKey, isOwner, currentUserEmail, initialMembers }: { projectKey: string; isOwner: boolean; currentUserEmail: string; initialMembers: Member[] }) {
  const router = useRouter();
  const [members] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(body.error ?? "Request failed.");
    return body;
  }

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/members", { method: "POST", body: JSON.stringify({ projectKey, email, role }) });
      setEmail("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Add failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: Member) {
    setBusy(true);
    setError("");
    try {
      const next = member.role === "OWNER" ? "EDITOR" : member.role === "EDITOR" ? "VIEWER" : "EDITOR";
      await request("/api/members", { method: "PATCH", body: JSON.stringify({ projectKey, memberId: member.id, role: next }) });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Role change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: Member) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/members?project=${encodeURIComponent(projectKey)}&id=${member.id}`, { method: "DELETE" });
      const text = await response.text();
      if (!response.ok) throw new Error(text ? JSON.parse(text).error : "Remove failed.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="eyebrow">Project settings</div>
      <h1>Members</h1>
      <p className="subtle">Roles: OWNER (admin), EDITOR (mutasi), VIEWER (baca). Guard seluruhnya enforce di server.</p>
      <section className="sheet" style={{ marginTop: 24 }}>
        <h2>Members ({members.length})</h2>
        {members.map((member) => (
          <div className="issue" key={member.id}>
            <span className={`severity ${member.role === "OWNER" ? "warning" : "info"}`}>{member.role}</span>
            <span><strong>{member.user.displayName ?? member.user.email}</strong><br /><span className="subtle">{member.user.email}{member.user.email === currentUserEmail ? " · kamu" : ""}</span>{isOwner && member.user.email !== currentUserEmail && (
              <span style={{ display: "flex", gap: 6, marginTop: 6 }}><button className="btn btn-quiet" disabled={busy} onClick={() => changeRole(member)}>Ubah role</button><button className="btn btn-quiet" disabled={busy} onClick={() => remove(member)}>Hapus</button></span>
            )}</span>
          </div>
        ))}
        {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      </section>
      {isOwner && (
        <section className="sheet" style={{ marginTop: 20 }}>
          <h2>Add member</h2>
          <p className="subtle">Menambahkan akun yang sudah ada (signup di halaman /signup). Undangan via email belum tersedia — masuk sebagai pengguna jadi {role}.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="member@example.com" style={{ flex: 1, height: 38, border: "1px solid var(--line)", padding: "0 10px" }} />
            <select value={role} onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")} style={{ height: 38, border: "1px solid var(--line)", padding: "0 8px" }}><option value="EDITOR">EDITOR</option><option value="VIEWER">VIEWER</option></select>
            <button className="btn btn-primary" disabled={busy || !email.trim()} onClick={add}>Add</button>
          </div>
        </section>
      )}
    </main>
  );
}