/**
 * Integration Test - Full Sync Flow
 *
 * Simulates a complete sync from Docsie to Maven with mocked APIs.
 * Verifies the entire pipeline works together correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocsieClient } from "../docsie/client.js";
import { MavenUploader } from "../maven/uploader.js";
import { DocsieSync } from "../sync/sync.js";
import { transformToMavenFormat } from "../maven/transform.js";
import type { DocsieArticle } from "../docsie/types.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Maven SDK
const mockCreateKnowledgeDocument = vi.fn();
const mockMavenClient = {
  knowledge: {
    createKnowledgeDocument: mockCreateKnowledgeDocument,
  },
};

describe("Integration: Full Sync Flow", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockCreateKnowledgeDocument.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  /**
   * Generate test articles matching real Docsie content structure
   */
  function generateTestArticles(count: number): DocsieArticle[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `art_${i + 1}`,
      name: `Help Article ${i + 1}`,
      description: "",
      slug: `help-article-${i + 1}`,
      doc: {
        blocks: [
          { type: "header-two", text: `Help Article ${i + 1}`, depth: 0, entityRanges: [], inlineStyleRanges: [] },
          { type: "unstyled", text: `This is the content for article ${i + 1}.`, depth: 0, entityRanges: [], inlineStyleRanges: [] },
          { type: "unstyled", text: "More details here.", depth: 0, entityRanges: [], inlineStyleRanges: [] },
        ],
      },
      order: i,
      tags: ["help", "documentation"],
      template: "default",
      updated_by: 1,
      updators: [],
      revision: 1,
    }));
  }

  /** Helper to create paginated response */
  function paginated<T>(results: T[], total: number, offset: number, limit: number): object {
    const hasNext = offset + results.length < total;
    return {
      count: total,
      next: hasNext ? `https://app.docsie.io/api_v2/003/articles/?limit=${limit}&offset=${offset + limit}` : null,
      previous: offset > 0 ? `https://app.docsie.io/api_v2/003/articles/?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
      results,
    };
  }

  /**
   * Setup mock fetch responses for Docsie API
   */
  function setupDocsieMocks(articles: DocsieArticle[]) {
    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = url.toString();

      // Workspaces endpoint
      if (urlStr.includes("/workspaces/")) {
        return {
          ok: true,
          json: async () => paginated(
            [{ id: "workspace_abc", name: "HubSync", slug: "hubsync", shelves_count: 10, created: "2024-01-01T00:00:00Z", modified: "2024-01-01T00:00:00Z", deleted: false, owner: 1, members: [], administrators: [], editors: [], viewers: [], public: true, config: {}, domain_name: null, domain_verified: false, allowed_hosts: [], custom_links: {} }],
            1, 0, 100
          ),
        };
      }

      // Articles endpoint (paginated)
      if (urlStr.includes("/articles/")) {
        const offsetMatch = urlStr.match(/offset=(\d+)/);
        const limitMatch = urlStr.match(/limit=(\d+)/);
        const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
        const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
        const pageArticles = articles.slice(offset, offset + limit);

        return {
          ok: true,
          json: async () => paginated(pageArticles, articles.length, offset, limit),
        };
      }

      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
    });
  }

  it("should sync 109 articles from Docsie to Maven", async () => {
    const articles = generateTestArticles(109);

    setupDocsieMocks(articles);
    mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

    const docsieClient = new DocsieClient({
      apiKey: "test-api-key",
      maxConcurrent: 100,
      minTime: 0,
    });

    const uploader = new MavenUploader(mockMavenClient as any, "docsie-kb", {
      retryConfig: { initialDelayMs: 1, backoffMultiplier: 1 },
    });

    const sync = new DocsieSync(docsieClient, uploader);
    const result = await sync.syncAll();

    expect(result.workspaces).toBe(1);
    expect(result.articles).toBe(109);
    expect(result.uploaded).toBe(109);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(109);
  });

  it("should transform articles correctly during sync", async () => {
    const articles = generateTestArticles(1);

    setupDocsieMocks(articles);
    mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

    const docsieClient = new DocsieClient({
      apiKey: "test-api-key",
      maxConcurrent: 100,
      minTime: 0,
    });

    const uploader = new MavenUploader(mockMavenClient as any, "docsie-kb", {
      retryConfig: { initialDelayMs: 1, backoffMultiplier: 1 },
    });

    const sync = new DocsieSync(docsieClient, uploader);
    await sync.syncAll();

    expect(mockCreateKnowledgeDocument).toHaveBeenCalledWith(
      "docsie-kb",
      expect.objectContaining({
        knowledgeDocumentId: { referenceId: "art_1" },
        contentType: "MARKDOWN",
        title: "Help Article 1",
        content: expect.stringContaining("## Help Article 1"),
        metadata: expect.objectContaining({
          source: "docsie",
          docsie_id: "art_1",
          slug: "help-article-1",
          tags: "help,documentation",
        }),
      })
    );
  });

  it("should handle partial failures gracefully", async () => {
    const articles = generateTestArticles(10);

    setupDocsieMocks(articles);

    // Fail on art_5 (all retries)
    mockCreateKnowledgeDocument.mockImplementation(async (_kbId: string, doc: any) => {
      if (doc.knowledgeDocumentId.referenceId === "art_5") {
        throw new Error("Upload failed for art_5");
      }
      return { success: true };
    });

    const docsieClient = new DocsieClient({
      apiKey: "test-api-key",
      maxConcurrent: 100,
      minTime: 0,
    });

    const uploader = new MavenUploader(mockMavenClient as any, "docsie-kb", {
      retryConfig: { initialDelayMs: 1, backoffMultiplier: 1, maxRetries: 3 },
    });

    const sync = new DocsieSync(docsieClient, uploader);
    const result = await sync.syncAll();

    expect(result.articles).toBe(10);
    expect(result.uploaded).toBe(9);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].docId).toBe("art_5");
  });

  it("should handle pagination correctly for large article sets", async () => {
    const articles = generateTestArticles(250);

    setupDocsieMocks(articles);
    mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

    const docsieClient = new DocsieClient({
      apiKey: "test-api-key",
      maxConcurrent: 100,
      minTime: 0,
    });

    const uploader = new MavenUploader(mockMavenClient as any, "docsie-kb", {
      retryConfig: { initialDelayMs: 1, backoffMultiplier: 1 },
    });

    const sync = new DocsieSync(docsieClient, uploader);
    const result = await sync.syncAll();

    expect(result.articles).toBe(250);
    expect(result.uploaded).toBe(250);
    expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(250);
  });
});

describe("Integration: Transform Pipeline", () => {
  it("should correctly transform Docsie article to Maven format", () => {
    const article: DocsieArticle = {
      id: "art_xyz",
      name: "Getting Started Guide",
      description: "How to get started",
      slug: "getting-started-guide",
      doc: {
        blocks: [
          { type: "header-two", text: "Getting Started", depth: 0, entityRanges: [], inlineStyleRanges: [] },
          { type: "unstyled", text: "Welcome to our platform.", depth: 0, entityRanges: [], inlineStyleRanges: [] },
        ],
      },
      order: 0,
      tags: ["tutorial", "beginner"],
      template: "default",
      updated_by: 1,
      updators: [],
      revision: 2,
    };

    const mavenDoc = transformToMavenFormat(article);

    expect(mavenDoc.knowledgeDocumentId.referenceId).toBe("art_xyz");
    expect(mavenDoc.contentType).toBe("MARKDOWN");
    expect(mavenDoc.title).toBe("Getting Started Guide");
    expect(mavenDoc.content).toContain("## Getting Started");
    expect(mavenDoc.content).toContain("Welcome to our platform.");
    expect(mavenDoc.metadata).toEqual({
      source: "docsie",
      docsie_id: "art_xyz",
      slug: "getting-started-guide",
      tags: "tutorial,beginner",
      template: "default",
    });
  });
});
