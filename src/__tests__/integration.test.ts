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
import type { DocsieDocumentFull, DocsieWorkspace } from "../docsie/types.js";

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
   * Generate test documents matching expected HubSync content
   */
  function generateTestDocuments(count: number): DocsieDocumentFull[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `doc-${i + 1}`,
      title: `Help Article ${i + 1}`,
      content: `# Help Article ${i + 1}\n\nThis is the content for article ${i + 1}.\n\n## Section\n\nMore details here.`,
      workspace_id: "ws-1",
      project_id: "proj-1",
      slug: `help-article-${i + 1}`,
      status: "published",
      author: "support@hubsync.com",
      tags: ["help", "documentation"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    }));
  }

  /**
   * Setup mock fetch responses for Docsie API
   */
  function setupDocsieMocks(workspaces: DocsieWorkspace[], documents: DocsieDocumentFull[]) {
    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = url.toString();

      // Workspaces endpoint
      if (urlStr.includes("/workspaces") && !urlStr.includes("/documents")) {
        return {
          ok: true,
          json: async () => workspaces,
        };
      }

      // Documents list endpoint (paginated)
      if (urlStr.includes("/documents") && urlStr.includes("page=")) {
        const pageMatch = urlStr.match(/page=(\d+)/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 1;
        const perPage = 100;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const pageDocuments = documents.slice(start, end).map((d) => ({
          id: d.id,
          title: d.title,
        }));

        return {
          ok: true,
          json: async () => pageDocuments,
        };
      }

      // Single document endpoint
      const docMatch = urlStr.match(/\/documents\/(doc-\d+)$/);
      if (docMatch) {
        const docId = docMatch[1];
        const doc = documents.find((d) => d.id === docId);
        if (doc) {
          return {
            ok: true,
            json: async () => doc,
          };
        }
      }

      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
    });
  }

  it("should sync 108 documents from Docsie to Maven", async () => {
    // Arrange: Setup mocks for 108 documents (HubSync expected count)
    const workspaces: DocsieWorkspace[] = [
      { id: "ws-1", name: "HubSync Help Center" },
    ];
    const documents = generateTestDocuments(108);

    setupDocsieMocks(workspaces, documents);
    mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

    // Create real clients with mocked fetch
    const docsieClient = new DocsieClient({
      apiKey: "test-api-key",
      maxConcurrent: 100, // No rate limiting for tests
      minTime: 0,
    });

    const uploader = new MavenUploader(mockMavenClient as any, "docsie-kb", {
      retryConfig: { initialDelayMs: 1, backoffMultiplier: 1 },
    });

    const sync = new DocsieSync(docsieClient, uploader);

    // Act
    const result = await sync.syncAll();

    // Assert
    expect(result.workspaces).toBe(1);
    expect(result.totalDocuments).toBe(108);
    expect(result.uploaded).toBe(108);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(108);
  });

  it("should transform documents correctly during sync", async () => {
    // Arrange
    const workspaces: DocsieWorkspace[] = [{ id: "ws-1", name: "Test" }];
    const documents = generateTestDocuments(1);

    setupDocsieMocks(workspaces, documents);
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

    // Act
    await sync.syncAll();

    // Assert: Verify transformation was applied
    expect(mockCreateKnowledgeDocument).toHaveBeenCalledWith(
      "docsie-kb",
      expect.objectContaining({
        knowledgeDocumentId: { referenceId: "doc-1" },
        contentType: "MARKDOWN",
        title: "Help Article 1",
        content: expect.stringContaining("# Help Article 1"),
        metadata: expect.objectContaining({
          source: "docsie",
          docsie_id: "doc-1",
          workspace_id: "ws-1",
          project_id: "proj-1",
        }),
      })
    );
  });

  it("should handle multiple workspaces", async () => {
    // Arrange
    const workspaces: DocsieWorkspace[] = [
      { id: "ws-1", name: "Help Center" },
      { id: "ws-2", name: "API Docs" },
    ];

    // Different documents for each workspace
    const ws1Docs = generateTestDocuments(50);
    const ws2Docs = generateTestDocuments(30).map((d, i) => ({
      ...d,
      id: `doc-ws2-${i + 1}`,
      workspace_id: "ws-2",
    }));

    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = url.toString();

      if (urlStr.includes("/workspaces") && !urlStr.includes("/documents")) {
        return { ok: true, json: async () => workspaces };
      }

      if (urlStr.includes("ws-1/documents")) {
        return { ok: true, json: async () => ws1Docs.map((d) => ({ id: d.id, title: d.title })) };
      }

      if (urlStr.includes("ws-2/documents")) {
        return { ok: true, json: async () => ws2Docs.map((d) => ({ id: d.id, title: d.title })) };
      }

      const docMatch = urlStr.match(/\/documents\/(doc-[\w-]+)$/);
      if (docMatch) {
        const docId = docMatch[1];
        const allDocs = [...ws1Docs, ...ws2Docs];
        const doc = allDocs.find((d) => d.id === docId);
        if (doc) {
          return { ok: true, json: async () => doc };
        }
      }

      return { ok: false, status: 404, statusText: "Not Found" };
    });

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

    // Act
    const result = await sync.syncAll();

    // Assert
    expect(result.workspaces).toBe(2);
    expect(result.totalDocuments).toBe(80); // 50 + 30
    expect(result.uploaded).toBe(80);
  });

  it("should handle partial failures gracefully", async () => {
    // Arrange
    const workspaces: DocsieWorkspace[] = [{ id: "ws-1", name: "Test" }];
    const documents = generateTestDocuments(10);

    setupDocsieMocks(workspaces, documents);

    // Fail on doc-5 (all 3 retries)
    mockCreateKnowledgeDocument.mockImplementation(async (_kbId: string, doc: any) => {
      if (doc.knowledgeDocumentId.referenceId === "doc-5") {
        throw new Error("Upload failed for doc-5");
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

    // Act
    const result = await sync.syncAll();

    // Assert
    expect(result.totalDocuments).toBe(10);
    expect(result.uploaded).toBe(9);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].docId).toBe("doc-5");
  });

  it("should handle pagination correctly for large document sets", async () => {
    // Arrange: 250 documents requiring 3 pages
    const workspaces: DocsieWorkspace[] = [{ id: "ws-1", name: "Large KB" }];
    const documents = generateTestDocuments(250);

    setupDocsieMocks(workspaces, documents);
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

    // Act
    const result = await sync.syncAll();

    // Assert
    expect(result.totalDocuments).toBe(250);
    expect(result.uploaded).toBe(250);
    expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(250);
  });
});

describe("Integration: Transform Pipeline", () => {
  it("should correctly transform Docsie document to Maven format", () => {
    // Arrange
    const docsieDoc: DocsieDocumentFull = {
      id: "doc-123",
      title: "Getting Started Guide",
      content: "# Getting Started\n\nWelcome to our platform.",
      workspace_id: "ws-1",
      project_id: "proj-1",
      slug: "getting-started-guide",
      status: "published",
      author: "docs@example.com",
      tags: ["tutorial", "beginner"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T12:30:00Z",
    };

    // Act
    const mavenDoc = transformToMavenFormat(docsieDoc);

    // Assert
    expect(mavenDoc.knowledgeDocumentId.referenceId).toBe("doc-123");
    expect(mavenDoc.contentType).toBe("MARKDOWN");
    expect(mavenDoc.title).toBe("Getting Started Guide");
    expect(mavenDoc.content).toBe("# Getting Started\n\nWelcome to our platform.");
    expect(mavenDoc.metadata).toEqual({
      source: "docsie",
      docsie_id: "doc-123",
      workspace_id: "ws-1",
      project_id: "proj-1",
      slug: "getting-started-guide",
      status: "published",
      author: "docs@example.com",
      tags: "tutorial,beginner",
    });
    expect(mavenDoc.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"));
    expect(mavenDoc.updatedAt).toEqual(new Date("2024-01-15T12:30:00Z"));
  });
});
