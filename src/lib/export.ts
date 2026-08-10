import type { Project } from "./types";

export function buildAgentExport(project: Project, target: "opencode" | "claude" | "codex" | "spec-kit" | "generic" = "generic") {
  const artifactIndex = project.artifacts.map((a) => `- ${a.id}: ${a.title} (${a.status})`).join("\n");
  const agents = `# AGENTS.md\n\n## Project\n${project.name}: ${project.description}\n\n## Architecture\nUse the validated architecture and decisions. Preserve stable artifact IDs in commits and tests.\n\n## Rules\n- Implement only validated requirements.\n- Enforce project authorization server-side.\n- Add tests linked to requirement IDs.\n- Review impact before changing contracts.\n\n## Artifacts\n${artifactIndex}\n`;
  return {
    target,
    generatedAt: new Date().toISOString(),
    files: {
      "AGENTS.md": agents,
      ".nexora/project.md": `# ${project.name}\n\n${project.description}\n\nComplexity: ${project.complexity}`,
      ".nexora/context.md": artifactIndex,
      ...Object.fromEntries(project.artifacts.map((a) => [`.nexora/${a.type}/${a.id}.md`, a.content])),
      ...(target === "spec-kit" ? { ".specify/memory/constitution.md": agents } : {}),
    },
  };
}
