/**
 * CLI Runner Functions
 *
 * Core functions for running sync and validation operations.
 */

import { MavenAGIClient } from "mavenagi";
import { DocsieClient } from "../docsie/client.js";
import { MavenUploader } from "../maven/uploader.js";
import { DocsieSync, type SyncResult } from "../sync/sync.js";
import {
  runValidation,
  type ValidationResult,
} from "../sync/validate.js";
import type { Config } from "./env.js";

export interface RunResult {
  success: boolean;
  exitCode: number;
  error?: string;
  syncResult?: SyncResult;
  validationResult?: ValidationResult;
}

/**
 * Run the full sync operation
 */
export async function runSync(
  config: Config,
  knowledgeBaseId: string
): Promise<RunResult> {
  try {
    console.log("=== Docsie to Maven Sync ===\n");

    // Initialize clients
    const docsieClient = new DocsieClient({
      apiKey: config.docsie.apiKey,
      baseUrl: config.docsie.baseUrl,
    });

    const mavenClient = new MavenAGIClient({
      organizationId: config.maven.organizationId,
      agentId: config.maven.agentId,
    });

    const uploader = new MavenUploader(mavenClient, knowledgeBaseId);

    // Run sync
    const sync = new DocsieSync(docsieClient, uploader);
    const result = await sync.syncAll();

    // Log summary
    console.log("\n=== Sync Complete ===");
    console.log(`Workspaces: ${result.workspaces}`);
    console.log(`Documents: ${result.totalDocuments}`);
    console.log(`Uploaded: ${result.uploaded}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Duration: ${result.durationMs}ms`);

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      for (const err of result.errors) {
        console.log(`  - ${err.docId}: ${err.error}`);
      }
    }

    return {
      success: true,
      exitCode: 0,
      syncResult: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nSync failed: ${message}`);

    return {
      success: false,
      exitCode: 1,
      error: message,
    };
  }
}

/**
 * Run validation only (no sync)
 */
export async function runValidate(
  config: Config,
  knowledgeBaseId: string,
  expectedDocCount?: number
): Promise<RunResult> {
  try {
    // Initialize clients
    const docsieClient = new DocsieClient({
      apiKey: config.docsie.apiKey,
      baseUrl: config.docsie.baseUrl,
    });

    const mavenClient = new MavenAGIClient({
      organizationId: config.maven.organizationId,
      agentId: config.maven.agentId,
    });

    // Run validation
    const result = await runValidation(docsieClient, mavenClient, knowledgeBaseId, {
      expectedDocumentCount: expectedDocCount,
    });

    return {
      success: result.ready,
      exitCode: result.ready ? 0 : 1,
      validationResult: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nValidation failed: ${message}`);

    return {
      success: false,
      exitCode: 1,
      error: message,
    };
  }
}
