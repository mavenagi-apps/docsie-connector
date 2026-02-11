import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateDocsieConnection,
  validateMavenConnection,
  runValidation,
} from "./validate.js";

// Mock DocsieClient
const mockGetWorkspaces = vi.fn();
const mockGetDocumentation = vi.fn();
const mockGetBooks = vi.fn();
const mockGetArticles = vi.fn();
const mockDocsieClient = {
  getWorkspaces: mockGetWorkspaces,
  getDocumentation: mockGetDocumentation,
  getBooks: mockGetBooks,
  getArticles: mockGetArticles,
};

// Mock MavenAGIClient
const mockGetKnowledgeBase = vi.fn();
const mockMavenClient = {
  knowledge: {
    getKnowledgeBase: mockGetKnowledgeBase,
  },
};

describe("validateDocsieConnection", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockReset();
    mockGetDocumentation.mockReset();
    mockGetBooks.mockReset();
    mockGetArticles.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when Docsie API responds", async () => {
    mockGetWorkspaces.mockResolvedValue([
      { id: "workspace_abc", name: "Test", shelves_count: 3 },
    ]);
    mockGetDocumentation.mockResolvedValue([
      { id: "doc_abc", name: "Shelf 1" },
    ]);
    mockGetBooks.mockResolvedValue([
      { id: "boo_abc", name: "Book 1" },
    ]);
    mockGetArticles.mockResolvedValue([
      { id: "art_1", name: "Article 1" },
      { id: "art_2", name: "Article 2" },
    ]);

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(true);
    expect(result.workspaces).toBe(1);
    expect(result.documentation).toBe(1);
    expect(result.books).toBe(1);
    expect(result.articles).toBe(2);
  });

  it("should return failure when Docsie API fails", async () => {
    mockGetWorkspaces.mockRejectedValue(new Error("Unauthorized"));

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle empty workspace", async () => {
    mockGetWorkspaces.mockResolvedValue([]);
    mockGetDocumentation.mockResolvedValue([]);
    mockGetBooks.mockResolvedValue([]);
    mockGetArticles.mockResolvedValue([]);

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(true);
    expect(result.workspaces).toBe(0);
    expect(result.articles).toBe(0);
  });
});

describe("validateMavenConnection", () => {
  beforeEach(() => {
    mockGetKnowledgeBase.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when Maven API responds", async () => {
    mockGetKnowledgeBase.mockResolvedValue({
      name: "Test KB",
      knowledgeBaseId: { referenceId: "kb-1" },
    });

    const result = await validateMavenConnection(mockMavenClient as any, "kb-1");

    expect(result.success).toBe(true);
    expect(result.knowledgeBaseName).toBe("Test KB");
  });

  it("should return failure when Maven API fails", async () => {
    mockGetKnowledgeBase.mockRejectedValue(new Error("Not found"));

    const result = await validateMavenConnection(mockMavenClient as any, "kb-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not found");
  });
});

describe("runValidation", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockReset();
    mockGetDocumentation.mockReset();
    mockGetBooks.mockReset();
    mockGetArticles.mockReset();
    mockGetKnowledgeBase.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should validate both Docsie and Maven connections", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test", shelves_count: 1 }]);
    mockGetDocumentation.mockResolvedValue([{ id: "doc_1" }]);
    mockGetBooks.mockResolvedValue([{ id: "boo_1" }]);
    mockGetArticles.mockResolvedValue([{ id: "art_1" }]);
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1"
    );

    expect(result.docsie.success).toBe(true);
    expect(result.maven.success).toBe(true);
    expect(result.ready).toBe(true);
  });

  it("should report not ready when Docsie fails", async () => {
    mockGetWorkspaces.mockRejectedValue(new Error("Auth failed"));
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1"
    );

    expect(result.docsie.success).toBe(false);
    expect(result.maven.success).toBe(true);
    expect(result.ready).toBe(false);
  });

  it("should compare article count to expected count when provided", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test", shelves_count: 1 }]);
    mockGetDocumentation.mockResolvedValue([]);
    mockGetBooks.mockResolvedValue([]);
    mockGetArticles.mockResolvedValue([{ id: "art_1" }, { id: "art_2" }]);
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1",
      { expectedArticleCount: 108 }
    );

    expect(result.docsie.articles).toBe(2);
    expect(result.countMismatch).toBe(true);
    expect(result.expectedCount).toBe(108);
  });

  it("should not report mismatch when count matches", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test", shelves_count: 1 }]);
    mockGetDocumentation.mockResolvedValue([]);
    mockGetBooks.mockResolvedValue([]);
    mockGetArticles.mockResolvedValue([{ id: "art_1" }, { id: "art_2" }]);
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1",
      { expectedArticleCount: 2 }
    );

    expect(result.countMismatch).toBe(false);
  });
});
