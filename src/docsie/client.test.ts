import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DocsieClient } from "./client.js";

describe("DocsieClient", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("initialization", () => {
    it("should initialize with API key and default base URL", () => {
      const client = new DocsieClient({ apiKey: "test-key" });

      expect(client).toBeDefined();
      expect(client.baseUrl).toBe("https://app.docsie.io/api/v1");
    });

    it("should initialize with custom base URL", () => {
      const client = new DocsieClient({
        apiKey: "test-key",
        baseUrl: "https://custom.docsie.io/api/v2",
      });

      expect(client.baseUrl).toBe("https://custom.docsie.io/api/v2");
    });

    it("should throw error if API key is missing", () => {
      expect(() => new DocsieClient({ apiKey: "" })).toThrow(
        "Docsie API key is required"
      );
    });
  });

  describe("authentication", () => {
    it("should include Bearer token in Authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const client = new DocsieClient({ apiKey: "test-api-key" });
      await client.get("/test-endpoint");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.docsie.io/api/v1/test-endpoint",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });
  });

  describe("request handling", () => {
    it("should return parsed JSON on successful response", async () => {
      const mockData = { workspaces: [{ id: "1", name: "Test" }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.get("/workspaces");

      expect(result).toEqual(mockData);
    });

    it("should throw on 401 Unauthorized response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const client = new DocsieClient({ apiKey: "invalid-key" });

      await expect(client.get("/workspaces")).rejects.toThrow(
        "Docsie API error: 401 Unauthorized"
      );
    });

    it("should throw on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new DocsieClient({ apiKey: "test-key" });

      await expect(client.get("/workspaces")).rejects.toThrow("Network error");
    });
  });

  describe("pagination", () => {
    it("should fetch single page when results < per_page", async () => {
      const mockItems = Array.from({ length: 50 }, (_, i) => ({ id: `${i}` }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllWithPagination<{ id: string }>(
        "/items",
        100
      );

      expect(result).toHaveLength(50);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should fetch multiple pages until results < per_page", async () => {
      // Page 1: 100 items (full page)
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      // Page 2: 50 items (partial page - stops here)
      const page2 = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 100}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2),
        });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllWithPagination<{ id: string }>(
        "/items",
        100
      );

      expect(result).toHaveLength(150);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should pass page and per_page query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      await client.fetchAllWithPagination("/items", 50);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=50"),
        expect.any(Object)
      );
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllWithPagination("/items", 100);

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should continue when results equal per_page", async () => {
      // Page 1: exactly 100 items (need to check for more)
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      // Page 2: 0 items (confirms no more)
      const page2: { id: string }[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2),
        });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllWithPagination<{ id: string }>(
        "/items",
        100
      );

      expect(result).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should log page counts during pagination", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      const page2 = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 100}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2),
        });

      const client = new DocsieClient({ apiKey: "test-key" });
      await client.fetchAllWithPagination("/items", 100);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Page 1")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Page 2")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("document fetching", () => {
    it("should fetch workspaces", async () => {
      const mockWorkspaces = [
        { id: "ws-1", name: "Workspace 1" },
        { id: "ws-2", name: "Workspace 2" },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWorkspaces),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getWorkspaces();

      expect(result).toEqual(mockWorkspaces);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspaces"),
        expect.any(Object)
      );
    });

    it("should fetch projects for a workspace", async () => {
      const mockProjects = [
        { id: "proj-1", workspace_id: "ws-1", name: "Project 1" },
        { id: "proj-2", workspace_id: "ws-1", name: "Project 2" },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getProjects("ws-1");

      expect(result).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspaces/ws-1/projects"),
        expect.any(Object)
      );
    });

    it("should fetch documents for a workspace", async () => {
      const mockDocs = [
        { id: "doc-1", title: "Doc 1" },
        { id: "doc-2", title: "Doc 2" },
      ];
      // Simulate pagination response (single page)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDocs),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getDocuments("ws-1");

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspaces/ws-1/documents"),
        expect.any(Object)
      );
    });

    it("should fetch a single document with full content", async () => {
      const mockDoc = {
        id: "doc-1",
        title: "Full Document",
        content: "# Heading\n\nThis is the full content.",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDoc),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getDocument("doc-1");

      expect(result).toEqual(mockDoc);
      expect(result.content).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/documents/doc-1"),
        expect.any(Object)
      );
    });

    it("should use pagination when fetching documents", async () => {
      // 150 docs across 2 pages
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`,
      }));
      const page2 = Array.from({ length: 50 }, (_, i) => ({
        id: `doc-${i + 100}`,
        title: `Doc ${i + 100}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2),
        });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getDocuments("ws-1");

      expect(result).toHaveLength(150);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
