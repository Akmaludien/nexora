import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const databaseDir = path.resolve(".postgres-data");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "nexora",
  password: "nexora_local_password",
  port: 55432,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => undefined,
});

async function start() {
  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase("nexora"); } catch (error) { if (!String(error).includes("already exists")) throw error; }
  console.log("Nexora PostgreSQL is running on 127.0.0.1:55432");
  await new Promise<void>((resolve) => { process.on("SIGINT", resolve); process.on("SIGTERM", resolve); });
  await pg.stop();
}

async function stop() { await pg.stop(); }

const command = process.argv[2] ?? "start";
(command === "stop" ? stop() : start()).catch((error) => { console.error(error); process.exit(1); });
