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
  documentation?: number;
  books?: number;
  articles?: number;
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
  /** Expected article count (for verification) */
  expectedArticleCount?: number;
}

/**
 * Validate Docsie API connection and count resources
 */
export async function validateDocsieConnection(
  client: DocsieClient
): Promise<DocsieValidationResult> {
  try {
    console.log("Validating Docsie connection...");

    const workspaces = await client.getWorkspaces();
    console.log(`Found ${workspaces.length} workspace(s)`);

    for (const ws of workspaces) {
      console.log(`  ${ws.name} (${ws.id}) - ${ws.shelves_count} shelves`);
    }

    const documentation = await client.getDocumentation();
    console.log(`Found ${documentation.length} documentation/shelves`);

    const books = await client.getBooks();
    console.log(`Found ${books.length} non-deleted books`);

    const articles = await client.getArticles();
    console.log(`Found ${articles.length} articles`);

    return {
      success: true,
      workspaces: workspaces.length,
      documentation: documentation.length,
      books: books.length,
      articles: articles.length,
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

  const docsie = await validateDocsieConnection(docsieClient);

  console.log("");

  const maven = await validateMavenConnection(mavenClient, knowledgeBaseId);

  const ready = docsie.success && maven.success;

  let countMismatch: boolean | undefined;
  if (options.expectedArticleCount !== undefined && docsie.articles !== undefined) {
    countMismatch = docsie.articles !== options.expectedArticleCount;
    if (countMismatch) {
      console.log(
        `\nWarning: Expected ${options.expectedArticleCount} articles, found ${docsie.articles}`
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
    expectedCount: options.expectedArticleCount,
    countMismatch,
  };
}
