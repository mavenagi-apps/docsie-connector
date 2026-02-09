import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, RetryConfig } from "./retry.js";

describe("withRetry", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("successful operations", () => {
    it("should return result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const result = await withRetry(fn, { context: "test" });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry behavior", () => {
    it("should retry on failure up to maxRetries times", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockRejectedValueOnce(new Error("Fail 3"));

      // Use minimal delays for fast tests
      const config: RetryConfig = {
        context: "test",
        maxRetries: 3,
        initialDelayMs: 1,
        backoffMultiplier: 1,
      };

      await expect(withRetry(fn, config)).rejects.toThrow("Fail 3");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should succeed if retry succeeds", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValueOnce("success");

      const config: RetryConfig = {
        context: "test",
        maxRetries: 3,
        initialDelayMs: 1,
        backoffMultiplier: 1,
      };

      const result = await withRetry(fn, config);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should apply backoff multiplier between retries", async () => {
      const startTime = Date.now();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockResolvedValueOnce("success");

      const config: RetryConfig = {
        context: "test",
        maxRetries: 2,
        initialDelayMs: 50,
        backoffMultiplier: 2,
      };

      const result = await withRetry(fn, config);
      const elapsed = Date.now() - startTime;

      expect(result).toBe("success");
      // Should have waited at least 50ms (initial delay)
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    it("should respect maxDelayMs cap", async () => {
      const startTime = Date.now();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValueOnce("success");

      const config: RetryConfig = {
        context: "test",
        maxRetries: 3,
        initialDelayMs: 50,
        backoffMultiplier: 100, // Would be 5000ms without cap
        maxDelayMs: 100, // Cap at 100ms
      };

      await withRetry(fn, config);
      const elapsed = Date.now() - startTime;

      // Should have waited ~150ms total (50 + 100), not 5050ms
      expect(elapsed).toBeLessThan(300);
    });
  });

  describe("error logging", () => {
    it("should log retry attempts with context", async () => {
      const warnSpy = vi.spyOn(console, "warn");
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce("success");

      await withRetry(fn, {
        context: "upload doc-123",
        initialDelayMs: 1,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[upload doc-123]"),
        expect.stringContaining("Network error"),
        expect.any(String)
      );
    });

    it("should log final failure", async () => {
      const warnSpy = vi.spyOn(console, "warn");
      const fn = vi.fn().mockRejectedValue(new Error("Persistent error"));

      const config: RetryConfig = {
        context: "test",
        maxRetries: 2,
        initialDelayMs: 1,
        backoffMultiplier: 1,
      };

      await expect(withRetry(fn, config)).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[test] failed after 2 attempts"),
        expect.stringContaining("Persistent error")
      );
    });
  });

  describe("default configuration", () => {
    it("should use default maxRetries of 3", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail"))
        .mockRejectedValueOnce(new Error("Fail"))
        .mockRejectedValueOnce(new Error("Fail"));

      // Override delays but use default maxRetries
      const config: RetryConfig = {
        context: "test",
        initialDelayMs: 1,
        backoffMultiplier: 1,
      };

      await expect(withRetry(fn, config)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
