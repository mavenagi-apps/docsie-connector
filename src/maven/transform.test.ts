import { describe, it, expect } from "vitest";
import { transformToMavenFormat } from "./transform.js";
import type { DocsieArticle } from "../docsie/types.js";

describe("transformToMavenFormat", () => {
  const sampleArticle: DocsieArticle = {
    id: "art_abc123",
    name: "Getting Started Guide",
    description: "How to get started",
    slug: "getting-started",
    doc: {
      blocks: [
        { type: "header-two", text: "Getting Started", depth: 0, entityRanges: [], inlineStyleRanges: [] },
        { type: "unstyled", text: "This is the getting started guide.", depth: 0, entityRanges: [], inlineStyleRanges: [] },
        { type: "unordered-list-item", text: "Step one", depth: 0, entityRanges: [], inlineStyleRanges: [] },
        { type: "unordered-list-item", text: "Step two", depth: 0, entityRanges: [], inlineStyleRanges: [] },
      ],
    },
    order: 1,
    tags: ["guide", "beginner"],
    template: "default",
    updated_by: 1,
    updators: [],
    revision: 3,
  };

  describe("required fields", () => {
    it("should map knowledgeDocumentId from article id", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.knowledgeDocumentId).toEqual({
        referenceId: "art_abc123",
      });
    });

    it("should map title from article name", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.title).toBe("Getting Started Guide");
    });

    it("should convert block content to markdown", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.content).toContain("## Getting Started");
      expect(result.content).toContain("This is the getting started guide.");
      expect(result.content).toContain("- Step one");
      expect(result.content).toContain("- Step two");
    });

    it("should set contentType to Markdown", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.contentType).toBe("MARKDOWN");
    });
  });

  describe("metadata mapping", () => {
    it("should include source metadata", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.metadata?.source).toBe("docsie");
      expect(result.metadata?.docsie_id).toBe("art_abc123");
    });

    it("should include tags as comma-separated string", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.metadata?.tags).toBe("guide,beginner");
    });

    it("should include slug", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.metadata?.slug).toBe("getting-started");
    });

    it("should include template", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.metadata?.template).toBe("default");
    });
  });

  describe("missing/optional fields", () => {
    it("should handle article with no content blocks", () => {
      const emptyArticle: DocsieArticle = {
        id: "art_empty",
        name: "Empty Article",
        description: "",
        slug: "empty",
        doc: { blocks: [] },
        order: 0,
        tags: [],
        template: "",
        updated_by: 1,
        updators: [],
        revision: 0,
      };

      const result = transformToMavenFormat(emptyArticle);

      expect(result.knowledgeDocumentId.referenceId).toBe("art_empty");
      expect(result.title).toBe("Empty Article");
      // Falls back to article name when content is empty
      expect(result.content).toBe("Empty Article");
      expect(result.contentType).toBe("MARKDOWN");
    });

    it("should handle missing tags gracefully", () => {
      const noTagsArticle: DocsieArticle = {
        ...sampleArticle,
        id: "art_notags",
        tags: [],
      };

      const result = transformToMavenFormat(noTagsArticle);

      expect(result.metadata?.tags).toBeUndefined();
    });
  });

  describe("referenceId for deduplication", () => {
    it("should use article id as referenceId", () => {
      const result = transformToMavenFormat(sampleArticle);

      expect(result.knowledgeDocumentId.referenceId).toBe("art_abc123");
    });

    it("should produce same referenceId for same article", () => {
      const result1 = transformToMavenFormat(sampleArticle);
      const result2 = transformToMavenFormat(sampleArticle);

      expect(result1.knowledgeDocumentId.referenceId).toBe(
        result2.knowledgeDocumentId.referenceId
      );
    });
  });
});
