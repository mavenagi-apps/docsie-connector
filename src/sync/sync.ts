/**
 * Docsie Sync Orchestrator
 *
 * Coordinates fetching documents from Docsie, transforming them,
 * and uploading to Maven knowledge base.
 */

import type { DocsieClient } from "../docsie/client.js";
import type { DocsieDocumentFull } from "../docsie/types.js";
import type { MavenUploader, UploadError } from "../maven/uploader.js";
import { transformToMavenFormat } from "../maven/transform.js";

export interface SyncConfig {
  /** Optional workspace IDs to sync (all if not specified) */
  workspaceIds?: string[];
}

export interface SyncResult {
  workspaces: number;
  totalDocuments: number;
  uploaded: number;
  failed: number;
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
   * Sync all documents from Docsie to Maven
   */
  async syncAll(config: SyncConfig = {}): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
      workspaces: 0,
      totalDocuments: 0,
      uploaded: 0,
      failed: 0,
      errors: [],
      durationMs: 0,
    };

    // Fetch workspaces
    console.log("Fetching workspaces from Docsie...");
    const workspaces = await this.docsieClient.getWorkspaces();
    result.workspaces = workspaces.length;

    if (workspaces.length === 0) {
      console.log("No workspaces found");
      result.durationMs = Date.now() - startTime;
      return result;
    }

    console.log(`Found ${workspaces.length} workspace(s)`);

    // Filter workspaces if specific IDs provided
    const targetWorkspaces = config.workspaceIds
      ? workspaces.filter((ws) => config.workspaceIds!.includes(ws.id))
      : workspaces;

    // Collect all documents from all workspaces
    const allFullDocs: DocsieDocumentFull[] = [];

    for (const workspace of targetWorkspaces) {
      console.log(`Fetching documents from workspace: ${workspace.name}`);

      // Get document list for workspace
      const docList = await this.docsieClient.getDocuments(workspace.id);
      console.log(`Found ${docList.length} document(s) in ${workspace.name}`);

      // Fetch full content for each document
      for (const doc of docList) {
        const fullDoc = await this.docsieClient.getDocument(doc.id);
        allFullDocs.push(fullDoc);
      }
    }

    result.totalDocuments = allFullDocs.length;

    if (allFullDocs.length === 0) {
      console.log("No documents to sync");
      result.durationMs = Date.now() - startTime;
      return result;
    }

    console.log(`Total documents to sync: ${allFullDocs.length}`);

    // Transform all documents to Maven format
    console.log("Transforming documents to Maven format...");
    const mavenDocs = allFullDocs.map(transformToMavenFormat);

    // Upload to Maven
    console.log("Uploading documents to Maven...");
    const uploadResult = await this.mavenUploader.upload(mavenDocs);

    result.uploaded = uploadResult.success;
    result.failed = uploadResult.failed;
    result.errors = uploadResult.errors;

    result.durationMs = Date.now() - startTime;

    console.log(
      `Sync complete: ${result.uploaded} uploaded, ${result.failed} failed in ${result.durationMs}ms`
    );

    return result;
  }
}
