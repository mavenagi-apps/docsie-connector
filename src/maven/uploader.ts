/**
 * Maven Knowledge Document Uploader
 *
 * Uploads documents to Maven in chunks with progress logging.
 * Includes retry logic with exponential backoff for transient failures.
 */

import type { MavenAGIClient } from "mavenagi";
import type { MavenKnowledgeDocument } from "./transform.js";
import { withRetry, type RetryConfig } from "../utils/retry.js";

const DEFAULT_CHUNK_SIZE = 50;

export interface UploadError {
  docId: string;
  error: string;
}

export interface UploadResult {
  total: number;
  success: number;
  failed: number;
  errors: UploadError[];
}

export interface UploaderConfig {
  chunkSize?: number;
  /** Override retry config for testing */
  retryConfig?: Partial<Omit<RetryConfig, "context">>;
}

export class MavenUploader {
  private readonly client: MavenAGIClient;
  private readonly knowledgeBaseId: string;
  private readonly chunkSize: number;
  private readonly retryConfig: Partial<Omit<RetryConfig, "context">>;

  constructor(
    client: MavenAGIClient,
    knowledgeBaseId: string,
    config: UploaderConfig = {}
  ) {
    this.client = client;
    this.knowledgeBaseId = knowledgeBaseId;
    this.chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
    this.retryConfig = config.retryConfig ?? {};
  }

  /**
   * Upload documents to Maven knowledge base in chunks
   */
  async upload(documents: MavenKnowledgeDocument[]): Promise<UploadResult> {
    const result: UploadResult = {
      total: documents.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    if (documents.length === 0) {
      return result;
    }

    // Split into chunks
    const chunks = this.chunkArray(documents, this.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNum = i + 1;

      console.log(
        `Chunk ${chunkNum}/${chunks.length}: Uploading ${chunk.length} documents...`
      );

      // Process each document in the chunk with retry
      for (const doc of chunk) {
        try {
          await withRetry(
            () =>
              this.client.knowledge.createKnowledgeDocument(
                this.knowledgeBaseId,
                {
                  knowledgeDocumentId: doc.knowledgeDocumentId,
                  contentType: doc.contentType,
                  title: doc.title,
                  content: doc.content,
                  metadata: doc.metadata,
                  createdAt: doc.createdAt,
                  updatedAt: doc.updatedAt,
                }
              ),
            {
              context: `upload ${doc.knowledgeDocumentId.referenceId}`,
              maxRetries: this.retryConfig.maxRetries ?? 3,
              initialDelayMs: this.retryConfig.initialDelayMs ?? 1000,
              backoffMultiplier: this.retryConfig.backoffMultiplier ?? 2,
            }
          );
          result.success++;
        } catch (error) {
          // Failed after all retries
          result.failed++;
          result.errors.push({
            docId: doc.knowledgeDocumentId.referenceId,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(
            `[upload ${doc.knowledgeDocumentId.referenceId}] permanently failed:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      console.log(
        `Chunk ${chunkNum} complete: ${result.success} success, ${result.failed} failed`
      );
    }

    return result;
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
