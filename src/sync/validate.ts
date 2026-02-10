/**
 * Pre-sync Validation
 *
 * Tests API connectivity and counts resources before syncing.
 * Run this before first sync to verify credentials and permissions.
 */

import type { DocsieClient } from "../docsie/client.js";
import type { MavenAGIClient } from "mavenagi";

export interface DocsieValidationResult {
  success: boolean;
  workspaces?: number;
  documents?: number;
  error?: string;
}

export interface MavenValidationResult {
  success: boolean;
  knowledgeBaseName?: string;
  error?: string;
}

export interface ValidationResult {
  docsie: DocsieValidationResult;
  maven: MavenValidationResult;
  ready: boolean;
  expectedCount?: number;
  countMismatch?: boolean;
}

export interface ValidationOptions {
  /** Expected document count (for verification) */
  expectedDocumentCount?: number;
}

/**
 * Validate Docsie API connection and count resources
 */
export async function validateDocsieConnection(
  client: DocsieClient
): Promise<DocsieValidationResult> {
  try {
    console.log("Validating Docsie connection...");

    // Test auth by fetching workspaces
    const workspaces = await client.getWorkspaces();
    console.log(`Found ${workspaces.length} workspace(s)`);

    // Count documents across all workspaces
    let totalDocuments = 0;
    for (const workspace of workspaces) {
      const docs = await client.getDocuments(workspace.id);
      totalDocuments += docs.length;
      console.log(`  ${workspace.name}: ${docs.length} document(s)`);
    }

    console.log(`Total documents: ${totalDocuments}`);

    return {
      success: true,
      workspaces: workspaces.length,
      documents: totalDocuments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Docsie validation failed: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validate Maven API connection
 */
export async function validateMavenConnection(
  client: MavenAGIClient,
  knowledgeBaseId: string
): Promise<MavenValidationResult> {
  try {
    console.log("Validating Maven connection...");

    // Test auth by fetching knowledge base
    const kb = await client.knowledge.getKnowledgeBase(knowledgeBaseId);
    console.log(`Knowledge base: ${kb.name}`);

    return {
      success: true,
      knowledgeBaseName: kb.name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Maven validation failed: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Run full validation of both Docsie and Maven connections
 */
export async function runValidation(
  docsieClient: DocsieClient,
  mavenClient: MavenAGIClient,
  knowledgeBaseId: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  console.log("=== Running Pre-Sync Validation ===\n");

  // Validate Docsie
  const docsie = await validateDocsieConnection(docsieClient);

  console.log("");

  // Validate Maven
  const maven = await validateMavenConnection(mavenClient, knowledgeBaseId);

  // Check if ready to sync
  const ready = docsie.success && maven.success;

  // Compare document count if expected count provided
  let countMismatch: boolean | undefined;
  if (options.expectedDocumentCount !== undefined && docsie.documents !== undefined) {
    countMismatch = docsie.documents !== options.expectedDocumentCount;
    if (countMismatch) {
      console.log(
        `\nWarning: Expected ${options.expectedDocumentCount} documents, found ${docsie.documents}`
      );
    }
  }

  console.log("\n=== Validation Summary ===");
  console.log(`Docsie: ${docsie.success ? "OK" : "FAILED"}`);
  console.log(`Maven: ${maven.success ? "OK" : "FAILED"}`);
  console.log(`Ready to sync: ${ready ? "YES" : "NO"}`);

  return {
    docsie,
    maven,
    ready,
    expectedCount: options.expectedDocumentCount,
    countMismatch,
  };
}
