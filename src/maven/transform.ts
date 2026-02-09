/**
 * Transform Docsie documents to Maven knowledge format
 */

import type { DocsieDocumentFull } from "../docsie/types.js";

/**
 * Maven Knowledge Document Request structure
 * Based on mavenagi SDK KnowledgeDocumentRequest type
 */
export interface MavenKnowledgeDocument {
  knowledgeDocumentId: {
    referenceId: string;
  };
  contentType: "MARKDOWN" | "HTML";
  title: string;
  content: string;
  metadata?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Transform a Docsie document to Maven knowledge format
 *
 * Uses the Docsie document ID as the referenceId for deduplication.
 * This ensures that re-syncing the same document updates rather than duplicates.
 */
export function transformToMavenFormat(
  doc: DocsieDocumentFull
): MavenKnowledgeDocument {
  const metadata: Record<string, string> = {
    source: "docsie",
    docsie_id: doc.id,
  };

  // Add optional metadata fields
  if (doc.workspace_id) {
    metadata.workspace_id = doc.workspace_id;
  }
  if (doc.project_id) {
    metadata.project_id = doc.project_id;
  }
  if (doc.tags && doc.tags.length > 0) {
    metadata.tags = doc.tags.join(",");
  }
  if (doc.author) {
    metadata.author = doc.author;
  }
  if (doc.slug) {
    metadata.slug = doc.slug;
  }
  if (doc.status) {
    metadata.status = doc.status;
  }

  const result: MavenKnowledgeDocument = {
    knowledgeDocumentId: {
      referenceId: doc.id,
    },
    contentType: "MARKDOWN",
    title: doc.title,
    content: doc.content,
    metadata,
  };

  // Add timestamps if present
  if (doc.created_at) {
    result.createdAt = new Date(doc.created_at);
  }
  if (doc.updated_at) {
    result.updatedAt = new Date(doc.updated_at);
  }

  return result;
}
