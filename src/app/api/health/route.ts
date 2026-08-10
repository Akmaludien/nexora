import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }
  const healthy = database === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}