import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, hasSameOrigin, requestIsSecure, sessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { incrementRateLimit } from "@/lib/project-repository";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email, a display name, and a password of at least 8 characters." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const subject = `signup:${email}:${request.headers.get("x-forwarded-for") ?? "local"}`;
  const limit = await incrementRateLimit({ subject, action: "signup", limit: 5, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many signup attempts." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) return NextResponse.json({ error: "Signup is unavailable." }, { status: 503 });
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const user = await db.user.create({ data: { email, passwordHash: await hash(parsed.data.password, 12), displayName: parsed.data.displayName ?? null } });
  const session = await createSession(user.id);
  const secure = requestIsSecure(request);
  const response = NextResponse.json({ ok: true, user: { email: user.email, displayName: user.displayName } }, { status: 201 });
  response.cookies.set(sessionCookie, session.token, { httpOnly: true, sameSite: "lax", secure, path: "/", expires: session.expiresAt });
  return response;
}