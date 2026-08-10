import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { db } from "../src/lib/db";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [require.resolve("tsx/cli"), "scripts/mcp-server.ts"],
    env: { ...process.env } as Record<string, string>,
  });
  const client = new Client({ name: "nexora-mcp-test", version: "1.0.0" });
  await client.connect(transport);
  const tools = await client.listTools();
  check(tools.tools.length >= 10, "MCP tool list too small");
  const context = await client.callTool({ name: "get_project_context", arguments: { projectKey: "nexora-demo" } });
  check(JSON.stringify(context.content).includes("nexora-demo"), "project context missing");
  const health = await client.callTool({ name: "get_spec_health", arguments: { projectKey: "nexora-demo" } });
  check(JSON.stringify(health.content).includes("overall"), "spec health missing");
  const search = await client.callTool({ name: "search_project_knowledge", arguments: { projectKey: "nexora-demo", query: "workspace" } });
  check(JSON.stringify(search.content).length > 2, "search returned nothing");
  const tasks = await client.callTool({ name: "get_tasks", arguments: { projectKey: "nexora-demo" } });
  const text = JSON.stringify(tasks.content).toLowerCase();
  check(text.includes("task"), "tasks missing");
  const denied = await client.callTool({ name: "get_project_context", arguments: { projectKey: "unknown-project" } });
  check((denied as { isError?: boolean }).isError === true, "unknown project was not rejected");
  await client.close();
  console.log("MCP assertions passed: tools, get_project_context, get_spec_health, search, get_tasks, access control");
}

main().finally(() => db.$disconnect()).catch((error) => { console.error(error); process.exit(1); });