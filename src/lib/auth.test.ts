import { ProjectRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const projectMemberFindFirst = vi.fn();
const sessionFindUnique = vi.fn();
const cookieGet = vi.fn();

vi.mock("./db", () => ({
  db: {
    projectMember: { findFirst: (...args: unknown[]) => projectMemberFindFirst(...args) },
    session: { findUnique: (...args: unknown[]) => sessionFindUnique(...args) },
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => cookieGet(name) }),
}));

const { authorizeProjectRequest, constantTimeEqual, hasSameOrigin, sessionCookie, SYSTEM_INTEGRATION_SUBJECT } = await import("./auth");

const TOKEN = "integration-token-fixture";
const MEMBER_USER_ID = "11111111-1111-4111-8111-111111111111";

function tokenRequest(token: string) {
  return new Request("http://local/api/design-context", { headers: { authorization: `Bearer ${token}` } });
}

function activeSession() {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    userId: MEMBER_USER_ID,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { status: "ACTIVE", email: "member@nexora.local" },
  };
}

beforeEach(() => {
  process.env.NEXORA_INTEGRATION_TOKEN = TOKEN;
  projectMemberFindFirst.mockReset();
  sessionFindUnique.mockReset();
  cookieGet.mockReset();
  cookieGet.mockReturnValue(undefined);
});

afterEach(() => {
  delete process.env.NEXORA_INTEGRATION_TOKEN;
});

describe("authentication boundaries", () => {
  it("compares sensitive values in constant-time shape", () => {
    expect(constantTimeEqual("same", "same")).toBe(true);
    expect(constantTimeEqual("same", "diff")).toBe(false);
    expect(constantTimeEqual("short", "longer")).toBe(false);
  });

  it("enforces same-origin mutations", () => {
    expect(hasSameOrigin(new Request("http://local/api", { headers: { origin: "http://local", host: "local" } }))).toBe(true);
    expect(hasSameOrigin(new Request("http://local/api", { headers: { origin: "https://attacker.example", host: "local" } }))).toBe(false);
  });
});

describe("authorizeProjectRequest — integration token", () => {
  it("grants access for a valid token when the project has a matching member", async () => {
    projectMemberFindFirst.mockResolvedValue({ userId: MEMBER_USER_ID, projectId: "p1", role: ProjectRole.OWNER, project: { key: "demo" } });
    const context = await authorizeProjectRequest(tokenRequest(TOKEN), "demo");
    expect(context).not.toBeNull();
    expect(context?.projectId).toBe("p1");
    expect(context?.userId).toBe(SYSTEM_INTEGRATION_SUBJECT);
    // System operations must never write a synthetic identity into a User FK.
    expect(context?.actorId).toBeNull();
  });

  it("does not grant global access: a project without members is denied", async () => {
    projectMemberFindFirst.mockResolvedValue(null);
    expect(await authorizeProjectRequest(tokenRequest(TOKEN), "demo")).toBeNull();
    expect(sessionFindUnique).not.toHaveBeenCalled();
  });

  it("scopes the membership lookup to the requested ACTIVE project and allowed roles", async () => {
    projectMemberFindFirst.mockResolvedValue({ userId: MEMBER_USER_ID, projectId: "p1", role: ProjectRole.EDITOR, project: { key: "demo" } });
    await authorizeProjectRequest(tokenRequest(TOKEN), "demo", [ProjectRole.OWNER, ProjectRole.EDITOR]);
    const where = projectMemberFindFirst.mock.calls[0][0].where;
    expect(where.project).toEqual({ key: "demo", status: "ACTIVE" });
    expect(where.role).toEqual({ in: [ProjectRole.OWNER, ProjectRole.EDITOR] });
  });

  it("falls back to the session flow for an invalid token and denies when unauthenticated", async () => {
    const context = await authorizeProjectRequest(tokenRequest("wrong-token"), "demo");
    expect(context).toBeNull();
    expect(projectMemberFindFirst).not.toHaveBeenCalled();
  });
});

describe("authorizeProjectRequest — session", () => {
  it("keeps the real user id as actor for a session-backed member", async () => {
    cookieGet.mockImplementation((name: string) => (name === sessionCookie ? { value: "session-token" } : undefined));
    sessionFindUnique.mockResolvedValue(activeSession());
    projectMemberFindFirst.mockResolvedValue({ projectId: "p1", role: ProjectRole.EDITOR, project: { key: "demo" } });
    const context = await authorizeProjectRequest(new Request("http://local/api/design-context"), "demo");
    expect(context?.userId).toBe(MEMBER_USER_ID);
    expect(context?.actorId).toBe(MEMBER_USER_ID);
    expect(projectMemberFindFirst.mock.calls[0][0].where.userId).toBe(MEMBER_USER_ID);
  });

  it("denies a session user who is not a member of the project", async () => {
    cookieGet.mockImplementation((name: string) => (name === sessionCookie ? { value: "session-token" } : undefined));
    sessionFindUnique.mockResolvedValue(activeSession());
    projectMemberFindFirst.mockResolvedValue(null);
    expect(await authorizeProjectRequest(new Request("http://local/api/design-context"), "demo")).toBeNull();
  });

  it("enforces writer roles when requested", async () => {
    cookieGet.mockImplementation((name: string) => (name === sessionCookie ? { value: "session-token" } : undefined));
    sessionFindUnique.mockResolvedValue(activeSession());
    projectMemberFindFirst.mockResolvedValue(null);
    expect(await authorizeProjectRequest(new Request("http://local/api/design-context"), "demo", [ProjectRole.OWNER, ProjectRole.EDITOR])).toBeNull();
    expect(projectMemberFindFirst.mock.calls[0][0].where.role).toEqual({ in: [ProjectRole.OWNER, ProjectRole.EDITOR] });
  });
});
