import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateDocsieConnection,
  validateMavenConnection,
  runValidation,
} from "./validate.js";

// Mock DocsieClient
const mockGetWorkspaces = vi.fn();
const mockGetDocuments = vi.fn();
const mockDocsieClient = {
  getWorkspaces: mockGetWorkspaces,
  getDocuments: mockGetDocuments,
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
    mockGetDocuments.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when Docsie API responds", async () => {
    mockGetWorkspaces.mockResolvedValue([
      { id: "ws-1", name: "Test Workspace" },
    ]);
    mockGetDocuments.mockResolvedValue([
      { id: "doc-1", title: "Doc 1" },
      { id: "doc-2", title: "Doc 2" },
    ]);

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(true);
    expect(result.workspaces).toBe(1);
    expect(result.documents).toBe(2);
  });

  it("should return failure when Docsie API fails", async () => {
    mockGetWorkspaces.mockRejectedValue(new Error("Unauthorized"));

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should count documents across multiple workspaces", async () => {
    mockGetWorkspaces.mockResolvedValue([
      { id: "ws-1", name: "Workspace 1" },
      { id: "ws-2", name: "Workspace 2" },
    ]);
    mockGetDocuments
      .mockResolvedValueOnce([{ id: "doc-1" }, { id: "doc-2" }])
      .mockResolvedValueOnce([{ id: "doc-3" }]);

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.workspaces).toBe(2);
    expect(result.documents).toBe(3);
  });

  it("should handle empty workspaces", async () => {
    mockGetWorkspaces.mockResolvedValue([]);

    const result = await validateDocsieConnection(mockDocsieClient as any);

    expect(result.success).toBe(true);
    expect(result.workspaces).toBe(0);
    expect(result.documents).toBe(0);
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

    const result = await validateMavenConnection(
      mockMavenClient as any,
      "kb-1"
    );

    expect(result.success).toBe(true);
    expect(result.knowledgeBaseName).toBe("Test KB");
  });

  it("should return failure when Maven API fails", async () => {
    mockGetKnowledgeBase.mockRejectedValue(new Error("Not found"));

    const result = await validateMavenConnection(
      mockMavenClient as any,
      "kb-1"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not found");
  });
});

describe("runValidation", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockReset();
    mockGetDocuments.mockReset();
    mockGetKnowledgeBase.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should validate both Docsie and Maven connections", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
    mockGetDocuments.mockResolvedValue([{ id: "doc-1" }]);
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

  it("should report not ready when Maven fails", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
    mockGetDocuments.mockResolvedValue([]);
    mockGetKnowledgeBase.mockRejectedValue(new Error("KB not found"));

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1"
    );

    expect(result.docsie.success).toBe(true);
    expect(result.maven.success).toBe(false);
    expect(result.ready).toBe(false);
  });

  it("should compare document count to expected count when provided", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
    mockGetDocuments.mockResolvedValue([{ id: "doc-1" }, { id: "doc-2" }]);
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1",
      { expectedDocumentCount: 108 }
    );

    expect(result.docsie.documents).toBe(2);
    expect(result.countMismatch).toBe(true);
    expect(result.expectedCount).toBe(108);
  });

  it("should not report mismatch when count matches", async () => {
    mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Test" }]);
    mockGetDocuments.mockResolvedValue([{ id: "doc-1" }, { id: "doc-2" }]);
    mockGetKnowledgeBase.mockResolvedValue({ name: "Test KB" });

    const result = await runValidation(
      mockDocsieClient as any,
      mockMavenClient as any,
      "kb-1",
      { expectedDocumentCount: 2 }
    );

    expect(result.countMismatch).toBe(false);
  });
});
