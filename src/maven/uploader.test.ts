import { describe, it, expect, vi, beforeEach } from "vitest";
import { MavenUploader } from "./uploader.js";
import type { MavenKnowledgeDocument } from "./transform.js";

// Mock Maven SDK
const mockCreateKnowledgeDocument = vi.fn();
const mockMavenClient = {
  knowledge: {
    createKnowledgeDocument: mockCreateKnowledgeDocument,
  },
};

describe("MavenUploader", () => {
  beforeEach(() => {
    mockCreateKnowledgeDocument.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  const createTestDoc = (id: string): MavenKnowledgeDocument => ({
    knowledgeDocumentId: { referenceId: id },
    contentType: "MARKDOWN",
    title: `Document ${id}`,
    content: `Content for ${id}`,
    metadata: { source: "docsie" },
  });

  describe("upload", () => {
    it("should upload single document successfully", async () => {
      mockCreateKnowledgeDocument.mockResolvedValueOnce({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const docs = [createTestDoc("doc-1")];

      const result = await uploader.upload(docs);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(1);
    });

    it("should upload documents in chunks of 50", async () => {
      mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      // Create 120 docs (should be 3 chunks: 50, 50, 20)
      const docs = Array.from({ length: 120 }, (_, i) =>
        createTestDoc(`doc-${i}`)
      );

      const result = await uploader.upload(docs);

      expect(result.success).toBe(120);
      expect(result.failed).toBe(0);
      expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(120);
    });

    it("should handle empty document array", async () => {
      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");

      const result = await uploader.upload([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockCreateKnowledgeDocument).not.toHaveBeenCalled();
    });

    it("should return failure count for failed uploads", async () => {
      mockCreateKnowledgeDocument
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Upload failed"))
        .mockResolvedValueOnce({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const docs = [
        createTestDoc("doc-1"),
        createTestDoc("doc-2"),
        createTestDoc("doc-3"),
      ];

      const result = await uploader.upload(docs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].docId).toBe("doc-2");
    });

    it("should continue processing after individual doc failure", async () => {
      mockCreateKnowledgeDocument
        .mockRejectedValueOnce(new Error("First failed"))
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const docs = [
        createTestDoc("doc-1"),
        createTestDoc("doc-2"),
        createTestDoc("doc-3"),
      ];

      const result = await uploader.upload(docs);

      // Should have processed all 3, even though first failed
      expect(mockCreateKnowledgeDocument).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
    });

    it("should log progress for each chunk", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      // Create 75 docs (2 chunks: 50, 25)
      const docs = Array.from({ length: 75 }, (_, i) =>
        createTestDoc(`doc-${i}`)
      );

      await uploader.upload(docs);

      // Should log for chunk 1 and chunk 2
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Chunk 1")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Chunk 2")
      );
    });

    it("should handle exactly 50 documents (one chunk)", async () => {
      mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const docs = Array.from({ length: 50 }, (_, i) =>
        createTestDoc(`doc-${i}`)
      );

      const result = await uploader.upload(docs);

      expect(result.success).toBe(50);
      expect(result.failed).toBe(0);
    });

    it("should pass correct parameters to Maven SDK", async () => {
      mockCreateKnowledgeDocument.mockResolvedValueOnce({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const doc = createTestDoc("doc-1");

      await uploader.upload([doc]);

      expect(mockCreateKnowledgeDocument).toHaveBeenCalledWith(
        "kb-1",
        expect.objectContaining({
          knowledgeDocumentId: { referenceId: "doc-1" },
          contentType: "MARKDOWN",
          title: "Document doc-1",
          content: "Content for doc-1",
        })
      );
    });
  });

  describe("uploadResult", () => {
    it("should include total count in result", async () => {
      mockCreateKnowledgeDocument.mockResolvedValue({ success: true });

      const uploader = new MavenUploader(mockMavenClient as any, "kb-1");
      const docs = Array.from({ length: 10 }, (_, i) =>
        createTestDoc(`doc-${i}`)
      );

      const result = await uploader.upload(docs);

      expect(result.total).toBe(10);
      expect(result.success + result.failed).toBe(result.total);
    });
  });
});
