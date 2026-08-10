import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDesignContext } from "../src/lib/design-context";
import { getProjectKnowledge } from "../src/lib/project-repository";
import { analyzeImpact, calculateHealth } from "../src/lib/intelligence";

const projectKeyInput = { projectKey: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/) };

function tokenAuth(args: { token?: string }) {
  const expected = process.env.NEXORA_MCP_TOKEN;
  if (!expected) return; // local trust mode
  if (!args.token || args.token !== expected) throw new Error("Invalid or missing MCP token.");
}

function requireProject(projectKey: string) {
  return getProjectKnowledge(projectKey).then((project) => {
    if (!project) throw new Error(`Project '${projectKey}' not found.`);
    return project;
  });
}

const server = new McpServer({ name: "nexora", version: "1.0.0" });

server.registerTool("get_project_context", { title: "Get project context", description: "Project identity, complexity, artifacts, and relationships.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify({ id: project.id, name: project.name, description: project.description, complexity: project.complexity, artifacts: project.artifacts.length, relationships: project.relationships.length }, null, 2) }] };
});

server.registerTool("get_requirements", { title: "Get requirements", description: "Requirements currently persisted for the project.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "requirement"), null, 2) }] };
});

server.registerTool("get_feature", { title: "Get feature", description: "A single feature artifact by ID.", inputSchema: { ...projectKeyInput, id: z.string(), token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  const feature = project.artifacts.find((a) => a.id === args.id && a.type === "feature") ?? null;
  return { content: [{ type: "text", text: JSON.stringify(feature, null, 2) }] };
});

server.registerTool("get_architecture", { title: "Get architecture", description: "Architecture artifacts.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "architecture"), null, 2) }] };
});

server.registerTool("get_api_spec", { title: "Get API specification", description: "API artifact contents.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "api"), null, 2) }] };
});

server.registerTool("get_database_schema", { title: "Get database schema", description: "Database artifact contents.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "database"), null, 2) }] };
});

server.registerTool("get_tasks", { title: "Get tasks", description: "Task artifacts.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "task"), null, 2) }] };
});

server.registerTool("get_decisions", { title: "Get decisions", description: "Decision artifacts (ADR).", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(project.artifacts.filter((a) => a.type === "decision"), null, 2) }] };
});

server.registerTool("get_design_context", { title: "Get design context", description: "Persisted Vinyasa design context payload and artifact reference.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const context = await getDesignContextByKey(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] };
});

server.registerTool("get_spec_health", { title: "Get spec health", description: "Dimensional health score and issues computed from persisted knowledge.", inputSchema: { ...projectKeyInput, token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(calculateHealth(project), null, 2) }] };
});

server.registerTool("get_impact_analysis", { title: "Get impact analysis", description: "Deterministic impact paths for an artifact.", inputSchema: { ...projectKeyInput, artifactId: z.string(), token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  return { content: [{ type: "text", text: JSON.stringify(analyzeImpact(project, args.artifactId), null, 2) }] };
});

server.registerTool("search_project_knowledge", { title: "Search project knowledge", description: "Search artifact IDs, titles, and content.", inputSchema: { ...projectKeyInput, query: z.string().min(1).max(200), token: z.string().optional() } }, async (args) => {
  tokenAuth(args);
  const project = await requireProject(args.projectKey);
  const query = args.query.toLowerCase();
  const results = project.artifacts.filter((a) => `${a.id} ${a.title} ${a.content}`.toLowerCase().includes(query)).slice(0, 20);
  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
});

async function getDesignContextByKey(projectKey: string) {
  const project = await dbProjectId(projectKey);
  const design = await getDesignContext(project);
  if (!design) throw new Error("No design context persisted for this project.");
  return { artifactKey: design.artifactKey, artifactVersion: design.artifactVersion, source: design.source, externalRef: design.externalRef, sourceVersion: design.sourceVersion, checksum: design.checksum, synchronizedAt: design.synchronizedAt, ctx: design.ctx };
}

async function dbProjectId(projectKey: string): Promise<string> {
  const { db } = await import("../src/lib/db");
  const project = await db.project.findUnique({ where: { key: projectKey }, select: { id: true } });
  if (!project) throw new Error(`Project '${projectKey}' not found.`);
  return project.id;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nexora MCP server running over stdio.");
}

main().catch((error) => { console.error(error); process.exit(1); });