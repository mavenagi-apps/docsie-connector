/**
 * Docsie Sync Orchestrator
 *
 * Fetches articles from Docsie, transforms to Maven format,
 * and uploads to Maven knowledge base.
 */

import type { DocsieClient } from "../docsie/client.js";
import type { DocsieArticle } from "../docsie/types.js";
import type { MavenUploader, UploadError } from "../maven/uploader.js";
import { transformToMavenFormat } from "../maven/transform.js";

export interface SyncConfig {
  /** Optional workspace IDs to filter by (all if not specified) */
  workspaceIds?: string[];
}

export interface SyncResult {
  workspaces: number;
  articles: number;
  uploaded: number;
  failed: number;
  skipped: number;
  errors: UploadError[];
  durationMs: number;
}

export class DocsieSync {
  private readonly docsieClient: DocsieClient;
  private readonly mavenUploader: MavenUploader;

  constructor(docsieClient: DocsieClient, mavenUploader: MavenUploader) {
    this.docsieClient = docsieClient;
    this.mavenUploader = mavenUploader;
  }

  /**
   * Sync all articles from Docsie to Maven
   */
  async syncAll(_config: SyncConfig = {}): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
      workspaces: 0,
      articles: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      durationMs: 0,
    };

    // Fetch workspaces for reporting
    console.log("Fetching workspaces from Docsie...");
    const workspaces = await this.docsieClient.getWorkspaces();
    result.workspaces = workspaces.length;
    console.log(`Found ${workspaces.length} workspace(s)`);

    // Fetch all articles directly (API returns articles across all workspaces)
    console.log("Fetching all articles...");
    const allArticles = await this.docsieClient.getArticles();
    console.log(`Found ${allArticles.length} articles`);

    // Filter out articles with no content
    const articlesWithContent: DocsieArticle[] = [];
    let skipped = 0;

    for (const article of allArticles) {
      const hasBlocks =
        article.doc &&
        article.doc.blocks &&
        article.doc.blocks.length > 0;

      if (hasBlocks) {
        articlesWithContent.push(article);
      } else {
        skipped++;
      }
    }

    result.articles = articlesWithContent.length;
    result.skipped = skipped;

    if (skipped > 0) {
      console.log(`Skipped ${skipped} articles with no content`);
    }

    if (articlesWithContent.length === 0) {
      console.log("No articles with content to sync");
      result.durationMs = Date.now() - startTime;
      return result;
    }

    console.log(`Articles to sync: ${articlesWithContent.length}`);

    // Transform all articles to Maven format
    console.log("Transforming articles to Maven format...");
    const mavenDocs = articlesWithContent.map(transformToMavenFormat);

    // Upload to Maven
    console.log("Uploading to Maven...");
    const uploadResult = await this.mavenUploader.upload(mavenDocs);

    result.uploaded = uploadResult.success;
    result.failed = uploadResult.failed;
    result.errors = uploadResult.errors;

    result.durationMs = Date.now() - startTime;

    console.log(
      `Sync complete: ${result.uploaded} uploaded, ${result.failed} failed, ${result.skipped} skipped in ${result.durationMs}ms`
    );

    return result;
  }
}
