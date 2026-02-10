import { describe, it, expect } from "vitest";
import { validateEnv, getConfig, runSync, runValidate } from "./cli/index.js";

describe("CLI exports", () => {
  it("should export validateEnv function", () => {
    expect(typeof validateEnv).toBe("function");
  });

  it("should export getConfig function", () => {
    expect(typeof getConfig).toBe("function");
  });

  it("should export runSync function", () => {
    expect(typeof runSync).toBe("function");
  });

  it("should export runValidate function", () => {
    expect(typeof runValidate).toBe("function");
  });
});
