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
});
