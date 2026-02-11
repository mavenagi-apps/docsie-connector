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

  /** Helper to create paginated response */
  function paginated<T>(results: T[], hasNext: boolean = false): object {
    return {
      count: results.length,
      next: hasNext ? "https://app.docsie.io/api_v2/003/items/?limit=100&offset=100" : null,
      previous: null,
      results,
    };
  }

  describe("initialization", () => {
    it("should initialize with API key and default base URL", () => {
      const client = new DocsieClient({ apiKey: "test-key" });

      expect(client).toBeDefined();
      expect(client.baseUrl).toBe("https://app.docsie.io/api_v2/003");
    });

    it("should initialize with custom base URL", () => {
      const client = new DocsieClient({
        apiKey: "test-key",
        baseUrl: "https://custom.docsie.io/api_v2/003",
      });

      expect(client.baseUrl).toBe("https://custom.docsie.io/api_v2/003");
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
        "https://app.docsie.io/api_v2/003/test-endpoint",
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
      const mockData = paginated([{ id: "ws-1", name: "Test" }]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.get("/workspaces/");

      expect(result).toEqual(mockData);
    });

    it("should throw on 401 Unauthorized response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const client = new DocsieClient({ apiKey: "invalid-key" });

      await expect(client.get("/workspaces/")).rejects.toThrow(
        "Docsie API error: 401 Unauthorized"
      );
    });

    it("should throw on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new DocsieClient({ apiKey: "test-key" });

      await expect(client.get("/workspaces/")).rejects.toThrow("Network error");
    });
  });

  describe("pagination", () => {
    it("should fetch single page when next is null", async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `${i}` }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated(items, false)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllPaginated<{ id: string }>("/items/", 100);

      expect(result).toHaveLength(50);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should fetch multiple pages until next is null", async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      const page2 = Array.from({ length: 50 }, (_, i) => ({ id: `${i + 100}` }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(paginated(page1, true)),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(paginated(page2, false)),
        });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllPaginated<{ id: string }>("/items/", 100);

      expect(result).toHaveLength(150);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should pass offset and limit query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated([], false)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      await client.fetchAllPaginated("/items/", 50);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=50"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("offset=0"),
        expect.any(Object)
      );
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated([], false)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.fetchAllPaginated("/items/", 100);

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("resource fetching", () => {
    it("should fetch workspaces", async () => {
      const mockWorkspaces = [
        { id: "workspace_abc", name: "Workspace 1", shelves_count: 5 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated(mockWorkspaces)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getWorkspaces();

      expect(result).toEqual(mockWorkspaces);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspaces/"),
        expect.any(Object)
      );
    });

    it("should fetch documentation (shelves)", async () => {
      const mockDocs = [
        { id: "doc_abc", name: "Getting Started", active_books_count: 3 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated(mockDocs)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getDocumentation();

      expect(result).toEqual(mockDocs);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/documentation/"),
        expect.any(Object)
      );
    });

    it("should fetch books excluding deleted by default", async () => {
      const mockBooks = [{ id: "boo_abc", name: "Book 1", deleted: false }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated(mockBooks)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getBooks();

      expect(result).toEqual(mockBooks);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("deleted=false"),
        expect.any(Object)
      );
    });

    it("should fetch articles filtered by book", async () => {
      const mockArticles = [{ id: "art_abc", name: "Article 1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(paginated(mockArticles)),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getArticles("boo_abc");

      expect(result).toEqual(mockArticles);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("book=boo_abc"),
        expect.any(Object)
      );
    });

    it("should fetch a single article", async () => {
      const mockArticle = {
        id: "art_abc",
        name: "Test Article",
        doc: { blocks: [{ type: "unstyled", text: "Hello" }] },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticle),
      });

      const client = new DocsieClient({ apiKey: "test-key" });
      const result = await client.getArticle("art_abc");

      expect(result).toEqual(mockArticle);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/articles/art_abc/"),
        expect.any(Object)
      );
    });
  });

  describe("rate limiting", () => {
    it("should apply rate limiting to requests", async () => {
      const timestamps: number[] = [];

      mockFetch.mockImplementation(async () => {
        timestamps.push(Date.now());
        return {
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        };
      });

      const client = new DocsieClient({ apiKey: "test-key" });

      await Promise.all([
        client.get("/test1"),
        client.get("/test2"),
        client.get("/test3"),
      ]);

      expect(timestamps).toHaveLength(3);

      if (timestamps.length >= 2) {
        const delay1 = timestamps[1] - timestamps[0];
        expect(delay1).toBeGreaterThanOrEqual(150);
      }
    });
  });
});
