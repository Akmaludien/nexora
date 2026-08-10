import { NextRequest, NextResponse } from "next/server";

export function proxy(request:NextRequest){
  if(!request.cookies.get("nexora_session")?.value)return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`,request.url));
  const response=NextResponse.next();
  response.headers.set("X-Content-Type-Options","nosniff");
  response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  return response;
}

export const config={matcher:["/dashboard/:path*","/projects/:path*"]};
