import { processNextJob } from "../src/lib/ai-job";
import { db } from "../src/lib/db";

let running = true;
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

async function main() {
  console.error("Nexora AI worker started.");
  while (running) {
    const processed = await processNextJob();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  await db.$disconnect();
  console.error("Nexora AI worker stopped.");
}

main().catch((error) => { console.error(error); process.exit(1); });