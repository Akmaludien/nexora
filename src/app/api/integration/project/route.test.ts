import { ProjectRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberContext } from "@/lib/project-repository";

const authorizeProjectRequest = vi.fn();
const getProjectKnowledge = vi.fn();
const getDesignContext = vi.fn();

vi.mock("@/lib/auth", () => ({
  authorizeProjectRequest: (...args: unknown[]) => authorizeProjectRequest(...args),
}));

vi.mock("@/lib/project-repository", () => ({
  getProjectKnowledge: (...args: unknown[]) => getProjectKnowledge(...args),
}));

vi.mock("@/lib/design-context", () => ({
  getDesignContext: (...args: unknown[]) => getDesignContext(...args),
}));

const { GET } = await import("./route");

const sessionContext: MemberContext = { userId: "user-1", actorId: "user-1", projectId: "p1", projectKey: "demo", role: ProjectRole.OWNER };
const tokenContext: MemberContext = { userId: "system:vinyasa-integration", actorId: null, projectId: "p1", projectKey: "demo", role: ProjectRole.EDITOR };

function knowledge() {
  return {
    id: "demo",
    name: "Demo",
    description: "Demo project",
    complexity: "Moderate",
    completeness: 0,
    artifacts: [{ id: "PRD-001", type: "prd", title: "Product vision", content: "# Demo", status: "Validated", version: 1, updatedAt: "2026-08-10T00:00:00.000Z" }],
    relationships: [],
  };
}

function request(query = "?project=demo") {
  return new Request(`http://local/api/integration/project${query}`);
}

beforeEach(() => {
  authorizeProjectRequest.mockReset();
  getProjectKnowledge.mockReset();
  getDesignContext.mockReset();
  getDesignContext.mockResolvedValue(null);
});

describe("GET /api/integration/project", () => {
  it("rejects an invalid project key with 400", async () => {
    const response = await GET(request("?project=INVALID_KEY!"));
    expect(response.status).toBe(400);
    expect(authorizeProjectRequest).not.toHaveBeenCalled();
  });

  it("returns 404 when the project does not exist", async () => {
    authorizeProjectRequest.mockResolvedValue(sessionContext);
    getProjectKnowledge.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(404);
  });

  it("serves the canonical envelope for a session member", async () => {
    authorizeProjectRequest.mockResolvedValue(sessionContext);
    getProjectKnowledge.mockResolvedValue(knowledge());
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schema_version).toBe("1.0");
    expect(body.project_id).toBe("demo");
    expect(body.project.key).toBe("demo");
    // Canonical name is `product`; `productContext` must never be introduced.
    expect(body).toHaveProperty("product");
    expect(body).not.toHaveProperty("productContext");
    expect(body.product.prd).toHaveLength(1);
    expect(Array.isArray(body.relationships)).toBe(true);
    expect(body.design).toBeNull();
  });

  it("serves the same envelope for a valid Bearer member", async () => {
    authorizeProjectRequest.mockResolvedValue(tokenContext);
    getProjectKnowledge.mockResolvedValue(knowledge());
    const response = await GET(new Request("http://local/api/integration/project?project=demo", { headers: { authorization: "Bearer token" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.project_id).toBe("demo");
    expect(body).toHaveProperty("product");
  });

  it("denies an invalid Bearer token", async () => {
    authorizeProjectRequest.mockResolvedValue(null);
    const response = await GET(new Request("http://local/api/integration/project?project=demo", { headers: { authorization: "Bearer wrong" } }));
    expect(response.status).toBe(404);
    expect(getProjectKnowledge).not.toHaveBeenCalled();
  });

  it("denies a non-member", async () => {
    authorizeProjectRequest.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(404);
  });
});
