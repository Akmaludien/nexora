import { ProjectRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberContext } from "@/lib/project-repository";

const authorizeProjectRequest = vi.fn();
const hasSameOrigin = vi.fn();
const integrationTokenIsValid = vi.fn();
const importDesignContext = vi.fn();
const getDesignContext = vi.fn();

vi.mock("@/lib/auth", () => ({
  authorizeProjectRequest: (...args: unknown[]) => authorizeProjectRequest(...args),
  hasSameOrigin: (...args: unknown[]) => hasSameOrigin(...args),
  integrationTokenIsValid: (...args: unknown[]) => integrationTokenIsValid(...args),
}));

vi.mock("@/lib/design-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/design-context")>("@/lib/design-context");
  return {
    ...actual,
    importDesignContext: (...args: unknown[]) => importDesignContext(...args),
    getDesignContext: (...args: unknown[]) => getDesignContext(...args),
  };
});

const { GET, POST } = await import("./route");

const writerContext: MemberContext = { userId: "user-1", actorId: "user-1", projectId: "p1", projectKey: "demo", role: ProjectRole.EDITOR };
const tokenContext: MemberContext = { userId: "system:vinyasa-integration", actorId: null, projectId: "p1", projectKey: "demo", role: ProjectRole.EDITOR };

const validPayload = {
  schemaVersion: "1.0.0",
  metadata: { tool: "vinyasa", version: "0.4.0" },
  source: { url: "https://shop.example/", title: "Shop" },
  tokens: { colors: { primary: [{ name: "blue", hex: "#2563eb", usage: 55 }] } },
  health: { overall: 91 },
  accessibility: { wcagAA: { critical: 0, warning: 1, pass: 5 } },
  components: [{ id: "button" }],
};

function post(body: unknown, init: { origin?: boolean; bearer?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.bearer) headers.authorization = `Bearer ${init.bearer}`;
  return new Request("http://local/api/design-context", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

beforeEach(() => {
  authorizeProjectRequest.mockReset();
  hasSameOrigin.mockReset();
  integrationTokenIsValid.mockReset();
  importDesignContext.mockReset();
  getDesignContext.mockReset();
  hasSameOrigin.mockReturnValue(true);
  integrationTokenIsValid.mockReturnValue(false);
  getDesignContext.mockResolvedValue(null);
});

describe("GET /api/design-context", () => {
  it("rejects an invalid project key with 400", async () => {
    const response = await GET(new Request("http://local/api/design-context?project=NOPE!"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when authorization fails", async () => {
    authorizeProjectRequest.mockResolvedValue(null);
    expect((await GET(new Request("http://local/api/design-context?project=demo"))).status).toBe(404);
  });

  it("returns the persisted design context for an authorized reader", async () => {
    authorizeProjectRequest.mockResolvedValue(writerContext);
    getDesignContext.mockResolvedValue({ checksum: "abc", ctx: { schema: "nexora.design-context" } });
    const response = await GET(new Request("http://local/api/design-context?project=demo"));
    expect(response.status).toBe(200);
    expect((await response.json()).design.checksum).toBe("abc");
  });
});

describe("POST /api/design-context", () => {
  it("rejects invalid JSON with 400", async () => {
    const response = await POST(post("{not json"));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid project key with 400", async () => {
    expect((await POST(post({ projectKey: "NOPE!", payload: validPayload }))).status).toBe(400);
  });

  it("rejects a cross-origin session request with 403", async () => {
    hasSameOrigin.mockReturnValue(false);
    const response = await POST(post({ projectKey: "demo", payload: validPayload }));
    expect(response.status).toBe(403);
    expect(authorizeProjectRequest).not.toHaveBeenCalled();
  });

  it("accepts a same-origin session writer and returns 201 on first import", async () => {
    authorizeProjectRequest.mockResolvedValue(writerContext);
    importDesignContext.mockResolvedValue({ artifactKey: "DESIGN-001", version: 1, checksum: "abc", synchronizedAt: "2026-08-10T00:00:00.000Z", duplicate: false });
    const response = await POST(post({ projectKey: "demo", payload: validPayload }));
    expect(response.status).toBe(201);
    expect((await response.json()).result.duplicate).toBe(false);
    expect(authorizeProjectRequest.mock.calls[0][2]).toEqual([ProjectRole.OWNER, ProjectRole.EDITOR]);
  });

  it("accepts a cross-origin Bearer writer", async () => {
    integrationTokenIsValid.mockReturnValue(true);
    hasSameOrigin.mockReturnValue(false);
    authorizeProjectRequest.mockResolvedValue(tokenContext);
    importDesignContext.mockResolvedValue({ artifactKey: "DESIGN-001", version: 1, checksum: "abc", synchronizedAt: "2026-08-10T00:00:00.000Z", duplicate: false });
    const response = await POST(post({ projectKey: "demo", payload: validPayload }, { bearer: "token" }));
    expect(response.status).toBe(201);
    // The system operation must not be attributed to a user row.
    expect(importDesignContext.mock.calls[0][0].actorId).toBeNull();
  });

  it("returns 200 for a duplicate import", async () => {
    authorizeProjectRequest.mockResolvedValue(writerContext);
    importDesignContext.mockResolvedValue({ artifactKey: "DESIGN-001", version: 1, checksum: "abc", synchronizedAt: "2026-08-10T00:00:00.000Z", duplicate: true });
    const response = await POST(post({ projectKey: "demo", payload: validPayload }));
    expect(response.status).toBe(200);
    expect((await response.json()).result.duplicate).toBe(true);
  });

  it("denies a valid Bearer token whose project has no matching member", async () => {
    integrationTokenIsValid.mockReturnValue(true);
    authorizeProjectRequest.mockResolvedValue(null);
    const response = await POST(post({ projectKey: "demo", payload: validPayload }, { bearer: "token" }));
    expect(response.status).toBe(403);
    expect(importDesignContext).not.toHaveBeenCalled();
  });

  it("denies an invalid token that is not a same-origin request", async () => {
    integrationTokenIsValid.mockReturnValue(false);
    hasSameOrigin.mockReturnValue(false);
    expect((await POST(post({ projectKey: "demo", payload: validPayload }, { bearer: "wrong" }))).status).toBe(403);
  });

  it("returns 422 when the payload carries no recognizable tokens", async () => {
    authorizeProjectRequest.mockResolvedValue(writerContext);
    const response = await POST(post({ projectKey: "demo", payload: { hello: "world" } }));
    expect(response.status).toBe(422);
    expect(importDesignContext).not.toHaveBeenCalled();
  });

  it("returns 500 without leaking internal detail when persistence fails", async () => {
    authorizeProjectRequest.mockResolvedValue(writerContext);
    importDesignContext.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(post({ projectKey: "demo", payload: validPayload }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Unable to import design context.");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    consoleError.mockRestore();
  });
});
