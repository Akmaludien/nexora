import { describe, expect, it } from "vitest";
import { demoProject } from "./demo";
import { buildAgentExport } from "./export";

describe("agent export", () => {
  it("includes instructions, context, and every artifact", () => {
    const result = buildAgentExport(demoProject, "opencode");
    expect(result.files["AGENTS.md"]).toContain("REQ-001");
    expect(result.files[".nexora/project.md"]).toBeTruthy();
    expect(result.files[".nexora/context.md"]).toBeTruthy();
    expect(Object.keys(result.files)).toHaveLength(demoProject.artifacts.length + 3);
  });

  it("adds Spec Kit compatibility mapping", () => {
    expect(buildAgentExport(demoProject, "spec-kit").files[".specify/memory/constitution.md"]).toBeTruthy();
  });
});
