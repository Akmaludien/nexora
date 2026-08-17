import { createHash } from "node:crypto";
import JSZip from "jszip";
import { ExportTarget } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDesignContext } from "@/lib/design-context";
import { buildAgentExport } from "@/lib/export";
import { getProjectKnowledge } from "@/lib/project-repository";
import { projectKeySchema } from "@/lib/validation";

const targets = ["opencode", "claude", "codex", "spec-kit", "generic"] as const;
const targetEnum: Record<(typeof targets)[number], ExportTarget> = { opencode: "OPENCODE", claude: "CLAUDE", codex: "CODEX", "spec-kit": "SPEC_KIT", generic: "GENERIC" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectKey = projectKeySchema.safeParse(url.searchParams.get("project"));
  if (!projectKey.success) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
  const context = await authorizeProject(projectKey.data);
  if (!context) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const target = targets.find((item) => item === url.searchParams.get("target")) ?? "generic";
  const project = await getProjectKnowledge(context.projectKey);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bundle = buildAgentExport(project, target);
  const files = [...Object.keys(bundle.files), ".nexora/relationships.json"];
  const preview = url.searchParams.get("preview") === "1";
  if (preview) {
    return NextResponse.json({ target, files, artifactCount: project.artifacts.length });
  }
  const zip = new JSZip();
  for (const [file, content] of Object.entries(bundle.files)) zip.file(file, content);
  zip.file(".nexora/relationships.json", JSON.stringify(project.relationships, null, 2));
  const design = await getDesignContext(context.projectId);
  if (design?.ctx) zip.file(".nexora/design/design-context.json", JSON.stringify(design.ctx, null, 2));
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const checksum = createHash("sha256").update(bytes).digest("hex");
  await db.projectExport.create({ data: { projectId: context.projectId, requestedById: context.userId, target: targetEnum[target], artifactCount: project.artifacts.length, checksum } });
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${project.id}-${target}.zip"`, "X-Nexora-Checksum": checksum } });
}