import { createHash } from "node:crypto";
import { ArtifactStatus, ArtifactType, DesignSource, MutationKind, RelationshipType } from "@prisma/client";
import { db } from "./db";
import type { MemberContext } from "./project-repository";

export interface NexoraDesignContext {
  schema: "nexora.design-context";
  version: 1;
  generatedBy: string;
  sourceVersion?: string;
  sourceUrl: string;
  sourceTitle: string;
  generatedAt: string;
  designSystem: {
    colors: Array<{ name: string; hex: string; usage: number }>;
    neutralColors: Array<{ name: string; hex: string; usage: number }>;
    fontFamilies: string[];
    fontSizes: Array<{ value: string; px: number | null }>;
    spacing: Array<{ value: string; px: number | null }>;
    radius: Array<{ value: string; px: number | null }>;
  };
  health: { overall: number | null };
  accessibility: { critical: number; warning: number; pass: number };
  components: { total: number };
}

export function isCanonicalDesignContext(value: unknown): value is NexoraDesignContext {
  const candidate = value as NexoraDesignContext;
  return Boolean(candidate && typeof candidate === "object" && candidate.schema === "nexora.design-context" && typeof candidate.designSystem === "object");
}

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string => (typeof value === "string" ? value : "");

function sliceColors(value: unknown): Array<{ name: string; hex: string; usage: number }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const hex = str((item as { hex?: unknown }).hex).trim();
    const name = str((item as { name?: unknown }).name).trim() || hex;
    const usage = num((item as { usage?: unknown }).usage);
    return hex ? [{ name, hex, usage: usage ?? 0 }] : [];
  });
}

function sliceScalars(value: unknown): Array<{ value: string; px: number | null }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = str((item as { raw?: unknown }).raw || (item as { value?: unknown }).value).trim();
    const px = num((item as { px?: unknown }).px);
    return raw ? [{ value: raw, px }] : [];
  });
}

function sliceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => str((item as { raw?: unknown }).raw ?? item)).filter(Boolean).slice(0, 8);
}

function toCanonical(value: unknown, fallbackUrl = ""): NexoraDesignContext {
  if (isCanonicalDesignContext(value)) return value;
  const model = value as {
    schemaVersion?: unknown;
    metadata?: { tool?: unknown; version?: unknown };
    source?: { url?: unknown; title?: unknown };
    tokens?: {
      colors?: { primary?: unknown; neutral?: unknown };
      typography?: { families?: unknown; sizes?: unknown };
      spacing?: unknown;
      radius?: unknown;
    };
    health?: { overall?: unknown };
    accessibility?: { wcagAA?: { critical?: unknown; warning?: unknown; pass?: unknown } };
    components?: unknown;
  };
  const tool = str(model.metadata?.tool) || "vinyasa";
  const sourceVersion = str(model.schemaVersion) || `vinyasa ${str(model.metadata?.version)}`;
  const tokenBlock = model.tokens ?? {};
  const a11y = model.accessibility?.wcagAA;
  const components = Array.isArray(model.components) ? model.components.length : typeof model.components === "object" && model.components ? Object.keys(model.components).length : 0;
  return {
    schema: "nexora.design-context",
    version: 1,
    generatedBy: `${tool} ${str(model.metadata?.version)}`,
    sourceUrl: str(model.source?.url) || fallbackUrl,
    sourceTitle: str(model.source?.title) || str(model.source?.url) || "Design system",
    generatedAt: new Date().toISOString(),
    designSystem: {
      colors: sliceColors(tokenBlock.colors?.primary),
      neutralColors: sliceColors(tokenBlock.colors?.neutral),
      fontFamilies: sliceStringArray(tokenBlock.typography?.families),
      fontSizes: sliceScalars(tokenBlock.typography?.sizes),
      spacing: sliceScalars(tokenBlock.spacing),
      radius: sliceScalars(tokenBlock.radius),
    },
    health: { overall: num(model.health?.overall) },
    accessibility: { critical: num(a11y?.critical) ?? 0, warning: num(a11y?.warning) ?? 0, pass: num(a11y?.pass) ?? 0 },
    components: { total: components },
    ...(sourceVersion ? { sourceVersion } : {}),
  };
}

export function parseDesignContextInput(value: unknown, fallbackUrl = ""): { ctx: NexoraDesignContext; isValid: boolean } {
  const ctx = toCanonical(value, fallbackUrl);
  const hasTokens = ctx.designSystem.colors.length + ctx.designSystem.neutralColors.length + ctx.designSystem.fontFamilies.length > 0;
  return { ctx, isValid: hasTokens };
}

function checksumOf(value: NexoraDesignContext): string {
  return createHash("sha256").update(JSON.stringify({ ...value, generatedAt: "" })).digest("hex").slice(0, 16);
}

export function buildDesignContextMarkdown(ctx: NexoraDesignContext): string {
  const lines: string[] = [];
  lines.push("# Design Context");
  lines.push("");
  lines.push(`> Sinkronisasi design intelligence dari **${ctx.generatedBy || "Vinyasa"}**.`);
  if (ctx.sourceUrl) lines.push(`> Sumber: ${ctx.sourceUrl}`);
  lines.push("");
  if (ctx.health.overall !== null) lines.push(`**Design health:** ${ctx.health.overall}/100`);
  lines.push(`**Komponen terdeteksi:** ${ctx.components.total}`);
  lines.push(`**Accessibility (WCAG AA):** ${ctx.accessibility.pass} pass · ${ctx.accessibility.warning} warning · ${ctx.accessibility.critical} critical`);
  lines.push("");
  if (ctx.designSystem.colors.length + ctx.designSystem.neutralColors.length > 0) {
    lines.push("## Warna");
    for (const color of [...ctx.designSystem.neutralColors, ...ctx.designSystem.colors].slice(0, 40)) lines.push(`- ${color.name}: \`${color.hex}\` (${color.usage}%)`);
    lines.push("");
  }
  if (ctx.designSystem.fontFamilies.length > 0) {
    lines.push("## Font family");
    lines.push(ctx.designSystem.fontFamilies.map((family) => `- ${family}`).join("\n"));
    lines.push("");
  }
  if (ctx.designSystem.fontSizes.length > 0) {
    lines.push("## Font scale");
    lines.push(ctx.designSystem.fontSizes.map((size) => `- ${size.value}${size.px !== null ? ` → ${size.px}px` : ""}`).join("\n"));
    lines.push("");
  }
  if (ctx.designSystem.spacing.length > 0) {
    lines.push("## Spacing");
    lines.push(ctx.designSystem.spacing.map((item) => `- ${item.value}`).join("\n"));
    lines.push("");
  }
  if (ctx.designSystem.radius.length > 0) {
    lines.push("## Radius");
    lines.push(ctx.designSystem.radius.map((item) => `- ${item.value}`).join("\n"));
    lines.push("");
  }
  lines.push("---");
  lines.push("Artifact ini adalah representasi project knowledge dari design intelligence. Datanya tetap disimpan sebagai `DesignContext` agar dapat disinkronkan ulang melalui Vinyasa.");
  return lines.join("\n");
}

export async function importDesignContext(context: MemberContext, input: { ctx: NexoraDesignContext; externalRef?: string; source?: DesignSource }) {
  const checksum = checksumOf(input.ctx);
  return db.$transaction(async (tx) => {
    let artifact = await tx.artifact.findFirst({ where: { projectId: context.projectId, type: ArtifactType.DESIGN_CONTEXT, archivedAt: null } });
    let created = false;
    let toVersion = 1;
    if (!artifact) {
      artifact = await tx.artifact.create({
        data: {
          projectId: context.projectId,
          key: "DESIGN-001",
          type: ArtifactType.DESIGN_CONTEXT,
          title: input.ctx.sourceTitle || "Design Context",
          status: ArtifactStatus.VALIDATED,
          currentVersionNumber: 1,
          versions: { create: { version: 1, title: input.ctx.sourceTitle || "Design Context", content: buildDesignContextMarkdown(input.ctx), changeNote: `Imported from ${input.ctx.generatedBy}`, createdById: context.userId } },
        },
      });
      created = true;
    } else {
      const next = artifact.currentVersionNumber + 1;
      toVersion = next;
      await tx.artifactVersion.create({ data: { artifactId: artifact.id, version: next, title: input.ctx.sourceTitle || artifact.title, content: buildDesignContextMarkdown(input.ctx), changeNote: `Synchronized from ${input.ctx.generatedBy}`, createdById: context.userId } });
      await tx.artifact.update({ where: { id: artifact.id }, data: { title: input.ctx.sourceTitle || artifact.title, currentVersionNumber: next } });
    }
    await tx.designContext.upsert({
      where: { artifactId: artifact.id },
      create: { projectId: context.projectId, artifactId: artifact.id, source: input.source ?? DesignSource.VINYASA, externalRef: input.externalRef ?? input.ctx.sourceUrl, sourceVersion: input.ctx.sourceVersion ?? input.ctx.generatedBy, checksum, payload: input.ctx as object, synchronizedAt: new Date() },
      update: { source: input.source ?? DesignSource.VINYASA, externalRef: input.externalRef ?? input.ctx.sourceUrl, sourceVersion: input.ctx.sourceVersion ?? input.ctx.generatedBy, checksum, payload: input.ctx as object, synchronizedAt: new Date() },
    });
    await tx.mutationRecord.create({
      data: { projectId: context.projectId, artifactId: artifact.id, actorId: context.userId, kind: created ? MutationKind.CREATE : MutationKind.UPDATE, toVersion, reason: `Design context ${created ? "created" : "synchronized"} from ${input.ctx.generatedBy}`, metadata: { checksum, externalRef: input.externalRef ?? input.ctx.sourceUrl } },
    });
    const prd = await tx.artifact.findFirst({ where: { projectId: context.projectId, type: ArtifactType.PRD, archivedAt: null } });
    if (prd && prd.id !== artifact.id) {
      const existing = await tx.artifactRelationship.findUnique({
        where: { projectId_sourceArtifactId_targetArtifactId_type: { projectId: context.projectId, sourceArtifactId: artifact.id, targetArtifactId: prd.id, type: RelationshipType.DERIVED_FROM } },
      });
      if (!existing) {
        await tx.artifactRelationship.create({ data: { projectId: context.projectId, sourceArtifactId: artifact.id, targetArtifactId: prd.id, type: RelationshipType.DERIVED_FROM, reason: "Design context is derived from the product vision" } });
      }
    }
    return { artifactKey: artifact.key, version: toVersion, checksum, synchronizedAt: new Date().toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function getDesignContext(projectId: string) {
  const row = await db.designContext.findFirst({ where: { projectId }, include: { artifact: true }, orderBy: { updatedAt: "desc" } });
  if (!row) return null;
  const ctx = row.payload as NexoraDesignContext | null;
  return { id: row.id, source: row.source, externalRef: row.externalRef, sourceVersion: row.sourceVersion, checksum: row.checksum, synchronizedAt: row.synchronizedAt?.toISOString() ?? null, artifactKey: row.artifact.key, artifactVersion: row.artifact.currentVersionNumber, ctx };
}