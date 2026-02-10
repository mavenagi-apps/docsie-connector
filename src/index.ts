#!/usr/bin/env node
/**
 * Docsie Connector CLI
 *
 * Syncs Docsie documentation to Maven AGI knowledge base.
 *
 * Usage:
 *   pnpm start [sync|validate]
 *
 * Commands:
 *   sync     - Run full sync (default)
 *   validate - Test credentials and count resources
 */

import "dotenv/config";
import { validateEnv, getConfig, runSync, runValidate } from "./cli/index.js";

const KNOWLEDGE_BASE_ID = process.env.MAVEN_KNOWLEDGE_BASE_ID ?? "docsie-kb";

async function main(): Promise<void> {
  console.log("Docsie Connector v1.0.0\n");

  // Validate environment
  const envResult = validateEnv();
  if (!envResult.valid) {
    console.error("Missing required environment variables:");
    for (const missing of envResult.missing) {
      console.error(`  - ${missing}`);
    }
    console.error("\nSee .env.example for required configuration.");
    process.exit(1);
  }

  const config = getConfig();
  const command = process.argv[2] ?? "sync";

  let result;

  switch (command) {
    case "validate":
      result = await runValidate(config, KNOWLEDGE_BASE_ID);
      break;

    case "sync":
      result = await runSync(config, KNOWLEDGE_BASE_ID);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: pnpm start [sync|validate]");
      process.exit(1);
  }

  process.exit(result.exitCode);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
