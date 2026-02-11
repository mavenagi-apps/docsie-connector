import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSync, runValidate } from "./run.js";

// Mock dependencies
vi.mock("../docsie/client.js", () => ({
  DocsieClient: vi.fn().mockImplementation(() => ({
    getWorkspaces: vi.fn(),
    getDocumentation: vi.fn(),
    getBooks: vi.fn(),
    getArticles: vi.fn(),
    getArticle: vi.fn(),
  })),
}));

vi.mock("mavenagi", () => ({
  MavenAGIClient: vi.fn().mockImplementation(() => ({
    knowledge: {
      createKnowledgeDocument: vi.fn(),
      getKnowledgeBase: vi.fn(),
    },
  })),
}));

vi.mock("../maven/uploader.js", () => ({
  MavenUploader: vi.fn().mockImplementation(() => ({
    upload: vi.fn(),
  })),
}));

vi.mock("../sync/sync.js", () => ({
  DocsieSync: vi.fn().mockImplementation(() => ({
    syncAll: vi.fn(),
  })),
}));

vi.mock("../sync/validate.js", () => ({
  runValidation: vi.fn(),
}));

import { DocsieSync } from "../sync/sync.js";
import { runValidation } from "../sync/validate.js";

describe("runSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const testConfig = {
    docsie: {
      apiKey: "docsie-key",
      baseUrl: "https://app.docsie.io/api_v2/003",
    },
    maven: {
      organizationId: "org-123",
      agentId: "agent-456",
      apiKey: "maven-key",
    },
  };

  it("should return success when sync completes", async () => {
    const mockSyncAll = vi.fn().mockResolvedValue({
      workspaces: 1,
      articles: 10,
      uploaded: 10,
      failed: 0,
      skipped: 0,
      errors: [],
      durationMs: 1000,
    });

    vi.mocked(DocsieSync).mockImplementation(
      () =>
        ({
          syncAll: mockSyncAll,
        }) as any
    );

    const result = await runSync(testConfig, "kb-1");

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.syncResult?.uploaded).toBe(10);
  });

  it("should return failure when sync throws", async () => {
    const mockSyncAll = vi
      .fn()
      .mockRejectedValue(new Error("Connection failed"));

    vi.mocked(DocsieSync).mockImplementation(
      () =>
        ({
          syncAll: mockSyncAll,
        }) as any
    );

    const result = await runSync(testConfig, "kb-1");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("Connection failed");
  });
});

describe("runValidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const testConfig = {
    docsie: {
      apiKey: "docsie-key",
      baseUrl: "https://app.docsie.io/api_v2/003",
    },
    maven: {
      organizationId: "org-123",
      agentId: "agent-456",
      apiKey: "maven-key",
    },
  };

  it("should return success when validation passes", async () => {
    vi.mocked(runValidation).mockResolvedValue({
      docsie: { success: true, workspaces: 1, documentation: 5, books: 10, articles: 109 },
      maven: { success: true, knowledgeBaseName: "Test KB" },
      ready: true,
    });

    const result = await runValidate(testConfig, "kb-1");

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("should return failure when validation fails", async () => {
    vi.mocked(runValidation).mockResolvedValue({
      docsie: { success: false, error: "Auth failed" },
      maven: { success: true, knowledgeBaseName: "Test KB" },
      ready: false,
    });

    const result = await runValidate(testConfig, "kb-1");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it("should return failure when validation throws", async () => {
    vi.mocked(runValidation).mockRejectedValue(new Error("Network error"));

    const result = await runValidate(testConfig, "kb-1");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("Network error");
  });
});
