import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocsieSync } from "./sync.js";
import type { DocsieDocumentFull } from "../docsie/types.js";

// Mock DocsieClient
const mockGetWorkspaces = vi.fn();
const mockGetDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockDocsieClient = {
  getWorkspaces: mockGetWorkspaces,
  getDocuments: mockGetDocuments,
  getDocument: mockGetDocument,
};

// Mock MavenUploader
const mockUpload = vi.fn();
const mockMavenUploader = {
  upload: mockUpload,
};

describe("DocsieSync", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockReset();
    mockGetDocuments.mockReset();
    mockGetDocument.mockReset();
    mockUpload.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  const createTestDoc = (id: string): DocsieDocumentFull => ({
    id,
    title: `Document ${id}`,
    content: `Content for ${id}`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  });

  describe("syncAll", () => {
    it("should sync documents from Docsie to Maven successfully", async () => {
      // Arrange
      const workspace = { id: "ws-1", name: "Test Workspace" };
      const docs = [
        { id: "doc-1", title: "Doc 1" },
        { id: "doc-2", title: "Doc 2" },
      ];
      const fullDocs = [createTestDoc("doc-1"), createTestDoc("doc-2")];

      mockGetWorkspaces.mockResolvedValue([workspace]);
      mockGetDocuments.mockResolvedValue(docs);
      mockGetDocument
        .mockResolvedValueOnce(fullDocs[0])
        .mockResolvedValueOnce(fullDocs[1]);
      mockUpload.mockResolvedValue({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      // Act
      const result = await sync.syncAll();

      // Assert
      expect(result.totalDocuments).toBe(2);
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
      expect(mockGetDocuments).toHaveBeenCalledWith("ws-1");
      expect(mockGetDocument).toHaveBeenCalledTimes(2);
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("should sync documents from multiple workspaces", async () => {
      const workspaces = [
        { id: "ws-1", name: "Workspace 1" },
        { id: "ws-2", name: "Workspace 2" },
      ];
      const docs1 = [{ id: "doc-1", title: "Doc 1" }];
      const docs2 = [{ id: "doc-2", title: "Doc 2" }];

      mockGetWorkspaces.mockResolvedValue(workspaces);
      mockGetDocuments
        .mockResolvedValueOnce(docs1)
        .mockResolvedValueOnce(docs2);
      mockGetDocument
        .mockResolvedValueOnce(createTestDoc("doc-1"))
        .mockResolvedValueOnce(createTestDoc("doc-2"));
      mockUpload.mockResolvedValue({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.totalDocuments).toBe(2);
      expect(mockGetDocuments).toHaveBeenCalledWith("ws-1");
      expect(mockGetDocuments).toHaveBeenCalledWith("ws-2");
    });

    it("should handle empty document list", async () => {
      mockGetWorkspaces.mockResolvedValue([{ id: "ws-1", name: "Empty" }]);
      mockGetDocuments.mockResolvedValue([]);

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.totalDocuments).toBe(0);
      expect(result.uploaded).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should handle no workspaces", async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.totalDocuments).toBe(0);
      expect(result.uploaded).toBe(0);
      expect(mockGetDocuments).not.toHaveBeenCalled();
    });

    it("should report partial failures from upload", async () => {
      const workspace = { id: "ws-1", name: "Test" };
      const docs = [
        { id: "doc-1", title: "Doc 1" },
        { id: "doc-2", title: "Doc 2" },
        { id: "doc-3", title: "Doc 3" },
      ];

      mockGetWorkspaces.mockResolvedValue([workspace]);
      mockGetDocuments.mockResolvedValue(docs);
      mockGetDocument
        .mockResolvedValueOnce(createTestDoc("doc-1"))
        .mockResolvedValueOnce(createTestDoc("doc-2"))
        .mockResolvedValueOnce(createTestDoc("doc-3"));
      mockUpload.mockResolvedValue({
        total: 3,
        success: 2,
        failed: 1,
        errors: [{ docId: "doc-2", error: "Upload failed" }],
      });

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.totalDocuments).toBe(3);
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].docId).toBe("doc-2");
    });

    it("should transform documents to Maven format before upload", async () => {
      const workspace = { id: "ws-1", name: "Test" };
      const doc = { id: "doc-1", title: "Doc 1" };
      const fullDoc = createTestDoc("doc-1");

      mockGetWorkspaces.mockResolvedValue([workspace]);
      mockGetDocuments.mockResolvedValue([doc]);
      mockGetDocument.mockResolvedValue(fullDoc);
      mockUpload.mockResolvedValue({
        total: 1,
        success: 1,
        failed: 0,
        errors: [],
      });

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      await sync.syncAll();

      // Verify upload was called with transformed documents
      expect(mockUpload).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            knowledgeDocumentId: { referenceId: "doc-1" },
            contentType: "MARKDOWN",
            title: "Document doc-1",
            content: "Content for doc-1",
          }),
        ])
      );
    });
  });

  describe("syncResult", () => {
    it("should include workspaces count in result", async () => {
      const workspaces = [
        { id: "ws-1", name: "W1" },
        { id: "ws-2", name: "W2" },
      ];

      mockGetWorkspaces.mockResolvedValue(workspaces);
      mockGetDocuments.mockResolvedValue([]);

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.workspaces).toBe(2);
    });

    it("should include duration in result", async () => {
      mockGetWorkspaces.mockResolvedValue([]);

      const sync = new DocsieSync(
        mockDocsieClient as any,
        mockMavenUploader as any
      );

      const result = await sync.syncAll();

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
