import { NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/lib/auth";
import { buildIntegrationContract } from "@/lib/integration";
import { projectKeySchema } from "@/lib/validation";

/**
 * Read-only Product Context endpoint for the Vinyasa integration.
 *
 * Returns a versioned, deterministic Product Context contract: project identity,
 * product intelligence (PRD, requirements, features, user stories, user flows,
 * business rules, architecture, decisions, API, database) with acceptance
 * criteria and milestones, relationships, and the last synchronized Design
 * Context — in a single round trip. Authenticated by either a browser session
 * or the shared server-to-server integration token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  if (!projectKey.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });

  const context = await authorizeProjectRequest(request, projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contract = await buildIntegrationContract(context);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(contract);
}