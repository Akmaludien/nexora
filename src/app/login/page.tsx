import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
export default function LoginPage(){return <main className="auth"><section className="auth-box"><div className="eyebrow">Secure workspace</div><h1>Sign in to Nexora</h1><p className="subtle" style={{fontSize:13}}>Local demo credentials are prefilled. Production credentials are configured through server-only environment variables.</p><Suspense fallback={<p>Loading...</p>}><LoginForm/></Suspense></section></main>}
