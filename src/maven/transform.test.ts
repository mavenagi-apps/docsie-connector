import { describe, it, expect } from "vitest";
import { transformToMavenFormat } from "./transform.js";
import type { DocsieDocumentFull } from "../docsie/types.js";

describe("transformToMavenFormat", () => {
  const sampleDocsieDoc: DocsieDocumentFull = {
    id: "doc-123",
    title: "Getting Started Guide",
    content: "# Getting Started\n\nThis is the getting started guide.",
    project_id: "proj-1",
    workspace_id: "ws-1",
    slug: "getting-started",
    status: "published",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    author: "John Doe",
    tags: ["guide", "beginner"],
  };

  describe("required fields", () => {
    it("should map knowledgeDocumentId from doc id", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.knowledgeDocumentId).toEqual({
        referenceId: "doc-123",
      });
    });

    it("should map title directly", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.title).toBe("Getting Started Guide");
    });

    it("should map content directly", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.content).toBe(
        "# Getting Started\n\nThis is the getting started guide."
      );
    });

    it("should set contentType to Markdown", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.contentType).toBe("MARKDOWN");
    });
  });

  describe("metadata mapping", () => {
    it("should include source metadata", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.metadata?.source).toBe("docsie");
      expect(result.metadata?.docsie_id).toBe("doc-123");
    });

    it("should include workspace and project ids", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.metadata?.workspace_id).toBe("ws-1");
      expect(result.metadata?.project_id).toBe("proj-1");
    });

    it("should include tags as comma-separated string", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.metadata?.tags).toBe("guide,beginner");
    });

    it("should include author if present", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.metadata?.author).toBe("John Doe");
    });
  });

  describe("timestamps", () => {
    it("should map createdAt from created_at", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.createdAt).toEqual(new Date("2024-01-15T10:00:00Z"));
    });

    it("should map updatedAt from updated_at", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      expect(result.updatedAt).toEqual(new Date("2024-01-20T15:30:00Z"));
    });
  });

  describe("missing/optional fields", () => {
    it("should handle doc with minimal fields", () => {
      const minimalDoc: DocsieDocumentFull = {
        id: "doc-minimal",
        title: "Minimal Doc",
        content: "Some content",
      };

      const result = transformToMavenFormat(minimalDoc);

      expect(result.knowledgeDocumentId.referenceId).toBe("doc-minimal");
      expect(result.title).toBe("Minimal Doc");
      expect(result.content).toBe("Some content");
      expect(result.contentType).toBe("MARKDOWN");
      expect(result.metadata?.source).toBe("docsie");
    });

    it("should handle missing tags gracefully", () => {
      const docWithoutTags: DocsieDocumentFull = {
        id: "doc-1",
        title: "No Tags",
        content: "Content",
      };

      const result = transformToMavenFormat(docWithoutTags);

      expect(result.metadata?.tags).toBeUndefined();
    });

    it("should handle missing timestamps gracefully", () => {
      const docWithoutTimestamps: DocsieDocumentFull = {
        id: "doc-1",
        title: "No Timestamps",
        content: "Content",
      };

      const result = transformToMavenFormat(docWithoutTimestamps);

      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeUndefined();
    });

    it("should handle empty content", () => {
      const docWithEmptyContent: DocsieDocumentFull = {
        id: "doc-1",
        title: "Empty Content",
        content: "",
      };

      const result = transformToMavenFormat(docWithEmptyContent);

      expect(result.content).toBe("");
    });
  });

  describe("referenceId for deduplication", () => {
    it("should use Docsie doc id as referenceId for deduplication", () => {
      const result = transformToMavenFormat(sampleDocsieDoc);

      // referenceId should be stable and unique for deduplication
      expect(result.knowledgeDocumentId.referenceId).toBe("doc-123");
    });

    it("should produce same referenceId for same doc", () => {
      const result1 = transformToMavenFormat(sampleDocsieDoc);
      const result2 = transformToMavenFormat(sampleDocsieDoc);

      expect(result1.knowledgeDocumentId.referenceId).toBe(
        result2.knowledgeDocumentId.referenceId
      );
    });
  });
});
