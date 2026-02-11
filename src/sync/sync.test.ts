import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocsieSync } from "./sync.js";
import type { DocsieArticle } from "../docsie/types.js";

// Mock DocsieClient
const mockGetWorkspaces = vi.fn();
const mockGetArticles = vi.fn();
const mockDocsieClient = {
  getWorkspaces: mockGetWorkspaces,
  getArticles: mockGetArticles,
};

// Mock MavenUploader
const mockUpload = vi.fn();
const mockMavenUploader = {
  upload: mockUpload,
};

describe("DocsieSync", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockReset();
    mockGetArticles.mockReset();
    mockUpload.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  const createTestArticle = (id: string, hasContent: boolean = true): DocsieArticle => ({
    id,
    name: `Article ${id}`,
    description: "",
    slug: `article-${id}`,
    doc: {
      blocks: hasContent
        ? [{ type: "unstyled", text: `Content for ${id}`, depth: 0, entityRanges: [], inlineStyleRanges: [] }]
        : [],
    },
    order: 0,
    tags: [],
    template: "default",
    updated_by: 1,
    updators: [],
    revision: 1,
  });

  describe("syncAll", () => {
    it("should sync articles from Docsie to Maven successfully", async () => {
      const articles = [createTestArticle("art_1"), createTestArticle("art_2")];

      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
      mockGetArticles.mockResolvedValue(articles);
      mockUpload.mockResolvedValue({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.articles).toBe(2);
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
      expect(mockGetArticles).toHaveBeenCalledTimes(1);
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("should skip articles with no content", async () => {
      const articles = [
        createTestArticle("art_1", true),
        createTestArticle("art_2", false), // empty
        createTestArticle("art_3", true),
      ];

      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
      mockGetArticles.mockResolvedValue(articles);
      mockUpload.mockResolvedValue({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.articles).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.uploaded).toBe(2);
    });

    it("should handle empty article list", async () => {
      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Empty" }]);
      mockGetArticles.mockResolvedValue([]);

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.articles).toBe(0);
      expect(result.uploaded).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should handle no workspaces", async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockGetArticles.mockResolvedValue([]);

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.workspaces).toBe(0);
    });

    it("should report partial failures from upload", async () => {
      const articles = [
        createTestArticle("art_1"),
        createTestArticle("art_2"),
        createTestArticle("art_3"),
      ];

      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
      mockGetArticles.mockResolvedValue(articles);
      mockUpload.mockResolvedValue({
        total: 3,
        success: 2,
        failed: 1,
        errors: [{ docId: "art_2", error: "Upload failed" }],
      });

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.articles).toBe(3);
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].docId).toBe("art_2");
    });

    it("should transform articles to Maven format before upload", async () => {
      const articles = [createTestArticle("art_1")];

      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
      mockGetArticles.mockResolvedValue(articles);
      mockUpload.mockResolvedValue({
        total: 1,
        success: 1,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      await sync.syncAll();

      expect(mockUpload).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            knowledgeDocumentId: { referenceId: "art_1" },
            contentType: "MARKDOWN",
            title: "Article art_1",
            content: expect.stringContaining("Content for art_1"),
          }),
        ])
      );
    });
  });

  describe("syncResult", () => {
    it("should include workspaces count in result", async () => {
      mockGetWorkspaces.mockResolvedValue([
        { id: "ws-1", name: "W1" },
        { id: "ws-2", name: "W2" },
      ]);
      mockGetArticles.mockResolvedValue([]);

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.workspaces).toBe(2);
    });

    it("should include duration in result", async () => {
      mockGetWorkspaces.mockResolvedValue([]);
      mockGetArticles.mockResolvedValue([]);

      const sync = new DocsieSync(mockDocsieClient as any, mockMavenUploader as any);
      const result = await sync.syncAll();

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
