import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <main className="auth">
      <section className="auth-box">
        <div className="eyebrow">Early access</div>
        <h1>Create a workspace</h1>
        <p className="subtle" style={{ fontSize: 13 }}>Akun dibuat dengan bcrypt, diberi rate limit, dan langsung mendapat session. Proyek baru bisa dibuat dari dashboard.</p>
        <SignupForm />
      </section>
    </main>
  );
}