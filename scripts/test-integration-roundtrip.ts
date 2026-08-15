import { ProjectRole } from "@prisma/client";
import { db } from "../src/lib/db";
import { requireMembership, createProjectWithOwner, getProjectKnowledge } from "../src/lib/project-repository";
import { buildIntegrationContract, PRODUCT_CONTEXT_SCHEMA_VERSION } from "../src/lib/integration";
import { importDesignContext, parseDesignContextInput, getDesignContext } from "../src/lib/design-context";
import type { MemberContext } from "../src/lib/project-repository";
import { seed } from "../prisma/seed";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function buildVinyasaDesignPayload(title: string) {
  return {
    schemaVersion: "1.0.0",
    metadata: { tool: "vinyasa", version: "0.4.0" },
    source: { url: `https://${title.toLowerCase()}.example/`, title },
    tokens: {
      colors: { primary: [{ name: "brand", hex: "#2563eb", usage: 55 }], neutral: [{ name: "ink", hex: "#111827", usage: 40 }] },
      typography: { families: [{ raw: '"Inter", sans-serif' }], sizes: [{ raw: "16px", px: 16 }] },
      spacing: [{ raw: "8px", px: 8 }],
      radius: [{ raw: "8px", px: 8 }],
    },
    health: { overall: 91 },
    accessibility: { wcagAA: { critical: 0, warning: 2, pass: 8 } },
    components: [{ id: "button", variants: 3 }, { id: "card" }, { id: "modal" }],
    pages: [{ path: "/dashboard", name: "Dashboard" }, { path: "/settings", name: "Settings" }],
    responsiveRules: [{ breakpoint: "md", columns: 12 }, { breakpoint: "sm", columns: 4 }],
    assets: [{ name: "logo.svg", kind: "vector" }, { name: "hero.png", kind: "raster" }],
    interactions: [{ element: "button", action: "click", effect: "navigate" }],
    implementationHints: { framework: "react", styling: "tailwind" },
  };
}

async function main() {
  await seed();
  const owner = await db.user.findUniqueOrThrow({ where: { email: "architect@nexora.local" } });
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const created = await createProjectWithOwner(owner.id, { name: `Roundtrip ${suffix}`, description: "Product Context round-trip fixture" });
  const context = await requireMembership(owner.id, created.key, [ProjectRole.OWNER]);
  check(context, "owner membership missing");

  // --- NEXORA → VINYASA: Product Context contract (what /api/integration/project serves) ---
  const contract = await buildIntegrationContract(context as MemberContext);
  check(contract, "integration contract missing");
  check(contract.project_id === created.key, "canonical project_id mismatch");
  check(contract.project.key === created.key, "project key mismatch");
  check(contract.schema_version === PRODUCT_CONTEXT_SCHEMA_VERSION, "schema version missing");
  check(contract.product.prd.length >= 1, "product context missing PRD");
  check(Array.isArray(contract.product.requirements) || Array.isArray(contract.product.features), "product context missing structured intelligence");

  // Vinyasa consumes the project identity from this contract.
  void contract.project_id;

  // Count product context before design import (must remain unchanged).
  const artifactRowsBefore = await db.artifact.count({ where: { projectId: context.projectId, archivedAt: null, type: { not: "DESIGN_CONTEXT" } } });

  // --- VINYASA → NEXORA: Design Context import (what /api/design-context POST persists) ---
  const payload = buildVinyasaDesignPayload("Roundtrip");
  const parsed = parseDesignContextInput(payload);
  check(parsed.isValid, "design payload not recognized");
  check(Array.isArray(parsed.ctx.design?.pages) && parsed.ctx.design.pages.length === 2, "design pages not preserved");
  check(Array.isArray(parsed.ctx.design?.responsiveRules) && parsed.ctx.design.responsiveRules.length === 2, "responsive rules not preserved");

  const imported = await importDesignContext(context as MemberContext, { ctx: parsed.ctx, externalRef: payload.source.url, source: "VINYASA" });
  const firstVersion = imported.version;
  check(!imported.duplicate, "initial import should not be a duplicate");

  const design = await getDesignContext(context.projectId);
  check(design, "design context not persisted");
  check(design.ctx?.health?.overall === 91, "design health not preserved");
  check(design.checksum === imported.checksum, "checksum not persisted");
  check(design.source === "VINYASA", "design source not persisted");
  check(design.ctx?.design && Array.isArray(design.ctx.design.pages) && design.ctx.design.pages.length === 2, "pages lost after persistence");
  check(design.ctx?.design && Array.isArray(design.ctx.design.assets) && design.ctx.design.assets.length === 2, "assets lost after persistence");
  check(design.ctx?.design && Array.isArray(design.ctx.design.interactions) && design.ctx.design.interactions.length === 1, "interactions lost after persistence");
  check(design.ctx?.design && typeof design.ctx.design.implementationHints === "object" && design.ctx.design.implementationHints !== null && (design.ctx.design.implementationHints as { framework?: string }).framework === "react", "implementation hints lost after persistence");

  // Product Context must be unchanged (no product artifacts created by import).
  const artifactRowsAfter = await db.artifact.count({ where: { projectId: context.projectId, archivedAt: null, type: { not: "DESIGN_CONTEXT" } } });
  check(artifactRowsAfter === artifactRowsBefore, "design import mutated product knowledge");

  // --- Duplicate sync: identical payload must not create a new version ---
  const again = await importDesignContext(context as MemberContext, { ctx: parseDesignContextInput(payload).ctx, source: "VINYASA" });
  check(again.duplicate === true, "duplicate sync was not idempotent");
  check(again.version === firstVersion, "duplicate sync bumped version");
  check((await getDesignContext(context.projectId))?.artifactVersion === firstVersion, "duplicate sync advanced active version");

  // --- Changed payload: new version, active version advances ---
  const changedPayload = { ...buildVinyasaDesignPayload("Roundtrip"), health: { overall: 95 } };
  const changed = await importDesignContext(context as MemberContext, { ctx: parseDesignContextInput(changedPayload).ctx, source: "VINYASA" });
  check(changed.duplicate === false, "changed payload treated as duplicate");
  check(changed.version > firstVersion, "changed payload did not create next version");
  check((await getDesignContext(context.projectId))?.artifactVersion === changed.version, "active design version did not advance");

  // --- System (token-backed) import: actorId null must not violate a FK ---
  const systemPayload = { ...buildVinyasaDesignPayload("Roundtrip"), health: { overall: 97 } };
  const systemContext: MemberContext = { ...(context as MemberContext), userId: "system:vinyasa-integration", actorId: null };
  const systemImport = await importDesignContext(systemContext, { ctx: parseDesignContextInput(systemPayload).ctx, source: "VINYASA" });
  check(systemImport.version > changed.version, "system import did not create next version");
  const systemMutation = await db.mutationRecord.findFirst({ where: { projectId: context.projectId, actorId: null }, orderBy: { createdAt: "desc" } });
  check(systemMutation, "system mutation record not persisted with a null actor");

  // --- Unauthorized project access: a non-member must not read this project ---
  const outsider = await db.user.upsert({ where: { email: `outsider-${suffix}@nexora.local`, }, create: { email: `outsider-${suffix}@nexora.local`, passwordHash: "x" }, update: {} });
  check(await requireMembership(outsider.id, created.key, [ProjectRole.VIEWER]) === null, "outsider granted access to project");

  // --- Standalone NEXORA: product knowledge still readable without Vinyasa ---
  const knowledge = await getProjectKnowledge(created.key);
  check(knowledge?.artifacts.some((a) => a.type === "prd"), "standalone product knowledge missing PRD");

  console.log("Round-trip assertions passed: same project_id, product context unchanged, design context persisted, versioning, duplicate sync, changed payload, system actor (null FK), unauthorized access, standalone product knowledge");
}

main()
  .finally(() => db.$disconnect())
  .catch((error) => { console.error(error); process.exit(1); });