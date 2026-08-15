/**
 * HTTP round-trip verification for the Vinyasa ↔ Nexora integration.
 * Exercises the real routes over HTTP: Product Context GET (session + Bearer),
 * Design Context POST/GET, idempotency, versioning, and authorization denial.
 * Requires a running app (E2E_BASE_URL, default http://127.0.0.1:3421) and DB.
 */
import { existsSync, readFileSync } from "node:fs";

/** Load NEXORA_INTEGRATION_TOKEN from .env.local when tsx was not given one. */
function envToken(): string {
  if (process.env.NEXORA_INTEGRATION_TOKEN) return process.env.NEXORA_INTEGRATION_TOKEN;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const match = /^NEXORA_INTEGRATION_TOKEN=(.*)$/m.exec(readFileSync(file, "utf8"));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3421";
const token = envToken();
const project = process.env.E2E_PROJECT ?? "nexora-demo";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`FAIL: ${message}`);
}
const pass = (message: string) => console.log(`  ok  ${message}`);

async function login(email: string, password: string) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  check(response.status === 200, `login ${response.status}`);
  return response.headers.get("set-cookie")!.split(";")[0];
}

function designPayload(overall: number) {
  return {
    schemaVersion: "1.0.0",
    metadata: { tool: "vinyasa", version: "0.4.0" },
    source: { url: "https://http-roundtrip.example/", title: "HTTP Round-trip" },
    tokens: {
      colors: { primary: [{ name: "brand", hex: "#2563eb", usage: 55 }], neutral: [{ name: "ink", hex: "#111827", usage: 40 }] },
      typography: { families: [{ raw: '"Inter", sans-serif' }], sizes: [{ raw: "16px", px: 16 }] },
      spacing: [{ raw: "8px", px: 8 }],
      radius: [{ raw: "8px", px: 8 }],
    },
    health: { overall },
    accessibility: { wcagAA: { critical: 0, warning: 2, pass: 8 } },
    components: { total: 3, blocks: [{ id: "hero" }, { id: "nav" }] },
    pages: [{ path: "/dashboard", name: "Dashboard" }, { path: "/settings", name: "Settings" }],
    responsiveRules: [{ breakpoint: "md", columns: 12 }],
    assets: [{ name: "logo.svg", kind: "vector" }],
    interactions: [{ element: "button", action: "click", effect: "navigate" }],
    implementationHints: { framework: "react", styling: "tailwind" },
    adaptation: { density: "comfortable" },
  };
}

async function main() {
  check(token, "NEXORA_INTEGRATION_TOKEN is not set — server-to-server path cannot be verified");
  const cookie = await login("architect@nexora.local", "nexora-production-foundation");
  const sessionHeaders = { origin: base, "content-type": "application/json", cookie };
  const bearerHeaders = { "content-type": "application/json", authorization: `Bearer ${token}` };

  console.log("Product Context — GET /api/integration/project");
  const invalidKey = await fetch(`${base}/api/integration/project?project=NOT_A_KEY`, { headers: bearerHeaders });
  check(invalidKey.status === 400, `invalid key returned ${invalidKey.status}`);
  pass("invalid project key → 400");

  const missing = await fetch(`${base}/api/integration/project?project=does-not-exist-xyz`, { headers: bearerHeaders });
  check(missing.status === 404, `missing project returned ${missing.status}`);
  pass("unknown project → 404");

  const noAuth = await fetch(`${base}/api/integration/project?project=${project}`);
  check(noAuth.status === 404, `unauthenticated returned ${noAuth.status}`);
  pass("no credentials → 404 (denied)");

  const badToken = await fetch(`${base}/api/integration/project?project=${project}`, { headers: { authorization: "Bearer wrong-token" } });
  check(badToken.status === 404, `invalid token returned ${badToken.status}`);
  pass("invalid Bearer → denied");

  const viaSession = await fetch(`${base}/api/integration/project?project=${project}`, { headers: sessionHeaders });
  check(viaSession.status === 200, `session read returned ${viaSession.status}`);
  const sessionContract = await viaSession.json();
  pass("session member → 200");

  const viaBearer = await fetch(`${base}/api/integration/project?project=${project}`, { headers: bearerHeaders });
  check(viaBearer.status === 200, `bearer read returned ${viaBearer.status}`);
  const contract = await viaBearer.json();
  pass("valid Bearer member → 200");

  check(contract.schema_version === "1.0", "schema_version missing");
  check(contract.project_id === project, `project_id mismatch: ${contract.project_id}`);
  check(contract.project?.key === project, "project.key mismatch");
  check(contract.product && !("productContext" in contract), "canonical envelope must use `product`");
  check(Array.isArray(contract.product.prd) && contract.product.prd.length >= 1, "product.prd empty");
  check(Array.isArray(contract.relationships), "relationships missing");
  check(contract.project_id === sessionContract.project_id, "session and bearer disagree on project_id");
  pass("canonical envelope: schema_version + project_id + product (no productContext)");

  const productKeysBefore = JSON.stringify(Object.keys(contract.product).map((key) => [key, contract.product[key].length]));

  console.log("Design Context — POST /api/design-context");
  const badJson = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: "{not json" });
  check(badJson.status === 400, `invalid JSON returned ${badJson.status}`);
  pass("invalid JSON → 400");

  const badProject = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: JSON.stringify({ projectKey: "NOT_A_KEY", payload: designPayload(90) }) });
  check(badProject.status === 400, `invalid project returned ${badProject.status}`);
  pass("invalid project key → 400");

  const crossOrigin = await fetch(`${base}/api/design-context`, {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json", cookie },
    body: JSON.stringify({ projectKey: project, payload: designPayload(90) }),
  });
  check(crossOrigin.status === 403, `cross-origin session returned ${crossOrigin.status}`);
  pass("cross-origin session mutation → 403");

  const emptyTokens = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: JSON.stringify({ projectKey: project, payload: { hello: "world" } }) });
  check(emptyTokens.status === 422, `token-less payload returned ${emptyTokens.status}`);
  pass("payload without design tokens → 422");

  const wrongTokenWrite = await fetch(`${base}/api/design-context`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer wrong-token" }, body: JSON.stringify({ projectKey: project, payload: designPayload(90) }) });
  check(wrongTokenWrite.status === 403, `invalid token write returned ${wrongTokenWrite.status}`);
  pass("invalid Bearer write → 403");

  const marker = Date.now() % 100;
  const first = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: JSON.stringify({ projectKey: project, payload: designPayload(marker), sourceUrl: "https://http-roundtrip.example/" }) });
  check(first.status === 201 || first.status === 200, `first import returned ${first.status}`);
  const firstBody = await first.json();
  check(firstBody.result.duplicate === false, "first import reported duplicate");
  const firstVersion = firstBody.result.version;
  pass(`Bearer writer import → ${first.status}, version ${firstVersion}`);

  const duplicate = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: JSON.stringify({ projectKey: project, payload: designPayload(marker), sourceUrl: "https://http-roundtrip.example/" }) });
  check(duplicate.status === 200, `duplicate import returned ${duplicate.status}`);
  const duplicateBody = await duplicate.json();
  check(duplicateBody.result.duplicate === true, "duplicate not detected");
  check(duplicateBody.result.version === firstVersion, "duplicate bumped version");
  pass("identical payload → 200, duplicate: true, version unchanged");

  const changed = await fetch(`${base}/api/design-context`, { method: "POST", headers: bearerHeaders, body: JSON.stringify({ projectKey: project, payload: designPayload(marker + 1), sourceUrl: "https://http-roundtrip.example/" }) });
  check(changed.status === 201, `changed import returned ${changed.status}`);
  const changedBody = await changed.json();
  check(changedBody.result.duplicate === false, "changed payload flagged duplicate");
  check(changedBody.result.version > firstVersion, "changed payload did not advance version");
  pass(`changed payload → 201, version ${changedBody.result.version}`);

  const sessionWrite = await fetch(`${base}/api/design-context`, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ projectKey: project, payload: designPayload(marker + 2) }) });
  check(sessionWrite.status === 201 || sessionWrite.status === 200, `session write returned ${sessionWrite.status}`);
  pass(`same-origin session writer → ${sessionWrite.status}`);

  console.log("Design Context — GET /api/design-context (lossless read-back)");
  const readBack = await fetch(`${base}/api/design-context?project=${project}`, { headers: bearerHeaders });
  check(readBack.status === 200, `read-back returned ${readBack.status}`);
  const ctx = (await readBack.json()).design?.ctx;
  check(ctx, "design context not persisted");
  check(ctx.schema === "nexora.design-context" && ctx.version === 1, "canonical schema/version lost");
  check(ctx.sourceUrl === "https://http-roundtrip.example/", "sourceUrl lost");
  check(ctx.sourceTitle === "HTTP Round-trip", "sourceTitle lost");
  check(typeof ctx.generatedBy === "string" && ctx.generatedBy.includes("vinyasa"), "generatedBy lost");
  check(typeof ctx.generatedAt === "string", "generatedAt lost");
  check(ctx.designSystem.colors.length === 1 && ctx.designSystem.neutralColors.length === 1, "colour tokens lost");
  check(ctx.designSystem.fontFamilies.length === 1 && ctx.designSystem.fontSizes.length === 1, "typography tokens lost");
  check(ctx.designSystem.spacing.length === 1 && ctx.designSystem.radius.length === 1, "spacing/radius lost");
  check(ctx.accessibility.pass === 8 && ctx.accessibility.warning === 2 && ctx.accessibility.critical === 0, "accessibility counters lost");
  check(ctx.components.total === 3, "components.total lost");
  check(Array.isArray(ctx.components.blocks) && ctx.components.blocks.length === 2, "components.blocks dropped");
  check(Array.isArray(ctx.design.pages) && ctx.design.pages.length === 2, "design.pages lost");
  check(Array.isArray(ctx.design.responsiveRules) && ctx.design.responsiveRules.length === 1, "design.responsiveRules lost");
  check(Array.isArray(ctx.design.assets) && ctx.design.assets.length === 1, "design.assets lost");
  check(Array.isArray(ctx.design.interactions) && ctx.design.interactions.length === 1, "design.interactions lost");
  check(ctx.design.implementationHints?.framework === "react", "design.implementationHints lost");
  check(ctx.design.adaptation?.density === "comfortable", "design.adaptation lost");
  pass("read-back preserves tokens, health, accessibility, components.blocks and the full design block");

  console.log("Product Context after design import");
  const after = await (await fetch(`${base}/api/integration/project?project=${project}`, { headers: bearerHeaders })).json();
  const productKeysAfter = JSON.stringify(Object.keys(after.product).map((key) => [key, after.product[key].length]));
  check(productKeysAfter === productKeysBefore, "design import mutated Product Context");
  check(after.design?.ctx?.components?.blocks?.length === 2, "Product Context does not embed the active design context");
  pass("product artifacts unchanged; contract embeds the active design context");

  console.log("\nHTTP round-trip verification PASSED");
}

main().catch((error) => { console.error(String(error)); process.exit(1); });
