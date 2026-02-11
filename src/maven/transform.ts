/**
 * Transform Docsie articles to Maven knowledge format
 */

import type { DocsieArticle } from "../docsie/types.js";
import { docToMarkdown } from "../docsie/content.js";

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
}

/**
 * Transform a Docsie article to Maven knowledge format
 *
 * Uses the article ID as the referenceId for deduplication.
 * Converts Draft.js block content to Markdown.
 */
export function transformToMavenFormat(
  article: DocsieArticle
): MavenKnowledgeDocument {
  const metadata: Record<string, string> = {
    source: "docsie",
    docsie_id: article.id,
  };

  if (article.tags && article.tags.length > 0) {
    metadata.tags = article.tags.join(",");
  }
  if (article.slug) {
    metadata.slug = article.slug;
  }
  if (article.template) {
    metadata.template = article.template;
  }

  const content = docToMarkdown(article.doc);

  return {
    knowledgeDocumentId: {
      referenceId: article.id,
    },
    contentType: "MARKDOWN",
    title: article.name,
    content: content || article.name,
    metadata,
  };
}
