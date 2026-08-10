import { ProjectRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeProject, hasSameOrigin } from "@/lib/auth";
import { addMember, listMembers, removeMember, setMemberRole } from "@/lib/project-repository";
import { memberRoleSchema, memberSchema, projectKeySchema } from "@/lib/validation";

const owners = [ProjectRole.OWNER];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  if (!projectKey.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  const context = await authorizeProject(projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ members: await listMembers(context.projectId) });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = memberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid member data." }, { status: 400 });
  const context = await authorizeProject(parsed.data.projectKey, owners);
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await addMember(context.projectId, parsed.data.email, parsed.data.role), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "No account exists for that email." }, { status: 404 });
    if (error instanceof Error && error.message) return NextResponse.json({ error: "Member could not be added." }, { status: 409 });
    return NextResponse.json({ error: "Member could not be added." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = memberRoleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role update." }, { status: 400 });
  const context = await authorizeProject(parsed.data.projectKey, owners);
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await setMemberRole(context.userId, context.projectId, parsed.data.memberId, parsed.data.role));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Owner role required." }, { status: 403 });
    if (error instanceof Error && error.message === "LAST_OWNER") return NextResponse.json({ error: "Cannot remove the last owner." }, { status: 409 });
    return NextResponse.json({ error: "Role update failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  const memberId = url.searchParams.get("id");
  if (!projectKey.success || !memberId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const context = await authorizeProject(projectKey.data, owners);
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await removeMember(context.userId, context.projectId, memberId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_OWNER") return NextResponse.json({ error: "Cannot remove the last owner." }, { status: 409 });
    if (error instanceof Error && error.message === "CANNOT_REMOVE_SELF") return NextResponse.json({ error: "Owner cannot remove self here." }, { status: 409 });
    return NextResponse.json({ error: "Member removal failed." }, { status: 500 });
  }
}