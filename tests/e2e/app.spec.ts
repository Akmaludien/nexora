import { test, expect, type Page } from "@playwright/test";
import { db } from "../../src/lib/db";

const OWNER_EMAIL = "architect@nexora.local";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "nexora-production-foundation";

test.beforeEach(async () => {
  await db.rateLimitWindow.deleteMany({});
});

test.afterAll(async () => {
  await db.$disconnect();
});

async function login(page: Page, email = OWNER_EMAIL, password = OWNER_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Enter workspace/ }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

async function openArtifact(page: Page, artifactKey = "REQ-001") {
  await page.goto(`/projects/nexora-demo/blueprint?artifact=${artifactKey}`);
  await expect(page.getByLabel("Markdown editor")).toBeVisible();
}

async function currentVersion(page: Page): Promise<number> {
  const meta = await page.locator(".doc-meta").innerText();
  const match = /v(\d+)/.exec(meta);
  expect(match).not.toBeNull();
  return Number(match![1]);
}

test("owner can sign in and see the demo project", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Orbit Workspace")).toBeVisible();
  await expect(page.getByText("Spec health").first()).toBeVisible();
});

test("artifact save persists across reload", async ({ page }) => {
  await login(page);
  await openArtifact(page);
  const marker = `Browser persisted ${Date.now()}`;
  await page.getByLabel("Markdown editor").fill(`${await page.getByLabel("Markdown editor").inputValue()}\n\n${marker}`);
  await page.getByRole("button", { name: /Save version/ }).click();
  await expect(page.getByRole("button", { name: /Save version/ })).toBeEnabled({ timeout: 15_000 });
  await expect.poll(async () => {
    const response = await page.request.get("/api/artifacts?project=nexora-demo&artifact=REQ-001");
    const body = await response.json();
    return body.project.artifacts.find((a: { id: string }) => a.id === "REQ-001")?.content ?? "";
  }, { timeout: 15_000 }).toContain(marker);
  await page.reload();
  await expect(page.getByLabel("Markdown editor")).toHaveValue(new RegExp(marker));
});

test("version history survives reload and restore creates a new version", async ({ page }) => {
  await login(page);
  await openArtifact(page);
  const start = await currentVersion(page);
  const textarea = page.getByLabel("Markdown editor");
  await textarea.fill(`${await textarea.inputValue()}\n\nbrowser v${start + 1} ${Date.now()}`);
  await page.getByRole("button", { name: /Save version/ }).click();
  await expect(page.locator(".doc-meta")).toContainText(`v${start + 1}`, { timeout: 15_000 });
  await textarea.fill(`${await textarea.inputValue()}\n\nbrowser v${start + 2} ${Date.now()}`);
  await page.getByRole("button", { name: /Save version/ }).click();
  await expect(page.locator(".doc-meta")).toContainText(`v${start + 2}`, { timeout: 15_000 });
  await page.reload();
  await expect(page.locator(".doc-meta")).toContainText(`v${start + 2}`);
  await page.getByRole("button", { name: /Restore v1 as a new version/ }).click();
  await expect(page.locator(".doc-meta")).toContainText(`v${start + 3}`, { timeout: 15_000 });
  await expect(page.getByLabel("Markdown editor")).toHaveValue(/# REQ-001/);
});

test("knowledge graph node opens detail and impact path", async ({ page }) => {
  await login(page);
  await page.goto("/projects/nexora-demo/knowledge-graph");
  await page.getByText("REQ-001", { exact: false }).first().click();
  await expect(page.getByText(/Open artifact/)).toBeVisible();
  await page.getByText("Impact path").first().click();
  await expect(page.getByText(/Impact analysis/)).toBeVisible();
});

test("impact apply-all persists the decision in the database", async ({ page }) => {
  await login(page);
  await page.goto("/projects/nexora-demo/impact?source=REQ-002");
  await page.getByRole("button", { name: /Apply all/ }).click();
  await expect(page.getByText(/APPLIED|applied/).first()).toBeVisible({ timeout: 15_000 });
  const latest = await db.impactAnalysis.findFirst({ where: { project: { key: "nexora-demo" } }, orderBy: { createdAt: "desc" } });
  expect(latest?.status).toBe("APPLIED");
  await page.reload();
  await expect(page.getByText(/Impact analysis/)).toBeVisible();
});

test("signup creates an account and a fresh project", async ({ page }) => {
  const email = `browser-${Date.now()}@nexora.local`;
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("Browser User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("browser-password-ok");
  await page.getByRole("button", { name: /Create workspace/ }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.getByLabel("Project name").fill("Browser Project");
  await page.getByRole("button", { name: /Create project/ }).click();
  await expect(page).toHaveURL(/\/projects\//, { timeout: 15_000 });
  await expect(page.getByText("Browser Project")).toBeVisible();
});

test("primary controls are keyboard reachable and labelled", async ({ page }) => {
  await login(page);
  await openArtifact(page);
  await expect(page.getByLabel("Markdown editor")).toBeAttached();
  await expect(page.getByRole("button", { name: /Save version/ })).toBeAttached();
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => /Save version/.test(document.activeElement?.textContent ?? ""));
  }
  expect(reached).toBe(true);
  await page.goto("/projects/nexora-demo/knowledge-graph");
  await expect(page.getByLabel("Search graph")).toBeVisible();
});