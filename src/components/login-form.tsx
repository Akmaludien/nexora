"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router=useRouter(), params=useSearchParams(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const response=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});if(!response.ok){const body=await response.json();setError(body.error);setBusy(false);return;}const requested=params.get("next");const destination=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";router.push(destination);router.refresh();}
  return <form onSubmit={submit}><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue="architect@nexora.local" autoComplete="email" required/><label htmlFor="password">Password</label><input id="password" name="password" type="password" defaultValue="nexora-production-foundation" autoComplete="current-password" minLength={8} required/>{error&&<p role="alert" style={{color:"var(--danger)",fontSize:13}}>{error}</p>}<button className="btn btn-primary" style={{width:"100%"}} disabled={busy}>{busy?"Signing in...":"Enter workspace"}</button></form>
}
