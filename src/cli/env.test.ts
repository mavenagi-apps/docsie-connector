import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv, getConfig } from "./env.js";

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return valid config when all required env vars are set", () => {
    process.env.DOCSIE_API_KEY = "docsie-key";
    process.env.MAVEN_ORGANIZATION_ID = "org-123";
    process.env.MAVEN_AGENT_ID = "agent-456";
    process.env.MAVEN_API_KEY = "maven-key";

    const result = validateEnv();

    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("should return invalid when DOCSIE_API_KEY is missing", () => {
    process.env.MAVEN_ORGANIZATION_ID = "org-123";
    process.env.MAVEN_AGENT_ID = "agent-456";
    process.env.MAVEN_API_KEY = "maven-key";

    const result = validateEnv();

    expect(result.valid).toBe(false);
    expect(result.missing).toContain("DOCSIE_API_KEY");
  });

  it("should return invalid when Maven vars are missing", () => {
    process.env.DOCSIE_API_KEY = "docsie-key";

    const result = validateEnv();

    expect(result.valid).toBe(false);
    expect(result.missing).toContain("MAVEN_ORGANIZATION_ID");
    expect(result.missing).toContain("MAVEN_AGENT_ID");
    expect(result.missing).toContain("MAVEN_API_KEY");
  });

  it("should list all missing vars", () => {
    // No env vars set
    delete process.env.DOCSIE_API_KEY;
    delete process.env.MAVEN_ORGANIZATION_ID;
    delete process.env.MAVEN_AGENT_ID;
    delete process.env.MAVEN_API_KEY;

    const result = validateEnv();

    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(4);
  });
});

describe("getConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config with env values", () => {
    process.env.DOCSIE_API_KEY = "docsie-key";
    process.env.DOCSIE_BASE_URL = "https://custom.docsie.io";
    process.env.MAVEN_ORGANIZATION_ID = "org-123";
    process.env.MAVEN_AGENT_ID = "agent-456";
    process.env.MAVEN_API_KEY = "maven-key";

    const config = getConfig();

    expect(config.docsie.apiKey).toBe("docsie-key");
    expect(config.docsie.baseUrl).toBe("https://custom.docsie.io");
    expect(config.maven.organizationId).toBe("org-123");
    expect(config.maven.agentId).toBe("agent-456");
    expect(config.maven.apiKey).toBe("maven-key");
  });

  it("should use default base URL when not provided", () => {
    process.env.DOCSIE_API_KEY = "docsie-key";
    process.env.MAVEN_ORGANIZATION_ID = "org-123";
    process.env.MAVEN_AGENT_ID = "agent-456";
    process.env.MAVEN_API_KEY = "maven-key";
    delete process.env.DOCSIE_BASE_URL;

    const config = getConfig();

    expect(config.docsie.baseUrl).toBe("https://app.docsie.io/api/v1");
  });

  it("should throw when required env vars are missing", () => {
    delete process.env.DOCSIE_API_KEY;

    expect(() => getConfig()).toThrow("Missing required environment variables");
  });
});
