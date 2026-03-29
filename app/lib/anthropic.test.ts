import { describe, it, expect } from "vitest";
import { validateAnthropicKey, maskAnthropicKey } from "~/lib/anthropic";

const VALID_KEY = "sk-ant-" + "a".repeat(40);

describe("validateAnthropicKey", () => {
  it("returns valid:true for a well-formed key", () => {
    expect(validateAnthropicKey(VALID_KEY)).toEqual({ valid: true });
  });

  it("returns error when prefix is missing", () => {
    const result = validateAnthropicKey("sk-" + "a".repeat(40));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("La clave debe comenzar con sk-ant-");
  });

  it("returns error when key has correct prefix but is too short", () => {
    const result = validateAnthropicKey("sk-ant-short");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/demasiado corta/);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateAnthropicKey("  " + VALID_KEY + "  ")).toEqual({ valid: true });
  });

  it("fails prefix check when only whitespace is given", () => {
    const result = validateAnthropicKey("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("La clave debe comenzar con sk-ant-");
  });
});

describe("maskAnthropicKey", () => {
  it("shows first 10 characters followed by exactly 8 bullet chars", () => {
    const masked = maskAnthropicKey("sk-ant-api01ABCDEFGHIJ");
    expect(masked).toBe("sk-ant-api" + "•".repeat(8));
    expect(masked.length).toBe(18);
  });
});
