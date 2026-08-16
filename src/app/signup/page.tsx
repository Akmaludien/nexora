import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <main className="auth">
      <section className="auth-box">
        <div className="eyebrow">Early access</div>
        <h1>Create a workspace</h1>
        <p className="subtle" style={{ fontSize: 13 }}>Accounts are hashed with bcrypt, rate-limited, and signed in immediately. New projects can be created from the dashboard.</p>
        <SignupForm />
      </section>
    </main>
  );
}