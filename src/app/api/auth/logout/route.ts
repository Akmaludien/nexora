import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasSameOrigin, requestIsSecure, revokeSession, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  await revokeSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", { httpOnly: true, sameSite: "lax", secure: requestIsSecure(request), expires: new Date(0), path: "/" });
  return response;
}