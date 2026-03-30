import { describe, it, expect, vi, type Mock } from "vitest";

// Mock the Anthropic SDK before importing the module under test
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class MockAuthenticationError extends Error { constructor() { super("auth"); } }
  class MockRateLimitError extends Error { constructor() { super("rate"); } }
  class MockAPIConnectionError extends Error { constructor() { super("conn"); } }

  const MockAnthropic = Object.assign(
    vi.fn().mockImplementation(() => ({ messages: { create: mockCreate } })),
    {
      AuthenticationError: MockAuthenticationError,
      RateLimitError: MockRateLimitError,
      APIConnectionError: MockAPIConnectionError,
    }
  );

  return { default: MockAnthropic };
});

import { categorizeExpense } from "~/lib/categorize.server";

const API_KEY = "sk-ant-test-key";

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("categorizeExpense", () => {
  it("returns the category when Claude responds with a valid value", async () => {
    mockCreate.mockResolvedValue(textResponse("Transporte"));
    await expect(categorizeExpense(API_KEY, "Uber al aeropuerto")).resolves.toBe("Transporte");
  });

  it("returns 'Otros' when Claude responds with an unrecognized category", async () => {
    mockCreate.mockResolvedValue(textResponse("Viajes"));
    await expect(categorizeExpense(API_KEY, "vuelo a Cancún")).resolves.toBe("Otros");
  });

  it("returns 'Otros' when Claude returns an empty response", async () => {
    mockCreate.mockResolvedValue({ content: [] });
    await expect(categorizeExpense(API_KEY, "algo raro")).resolves.toBe("Otros");
  });

  it("trims whitespace from Claude's response before matching", async () => {
    mockCreate.mockResolvedValue(textResponse("  Salud  "));
    await expect(categorizeExpense(API_KEY, "farmacia")).resolves.toBe("Salud");
  });

  it("throws a Spanish error on AuthenticationError", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mockCreate.mockRejectedValue(new (Anthropic as unknown as { AuthenticationError: new () => Error }).AuthenticationError());
    await expect(categorizeExpense(API_KEY, "algo")).rejects.toThrow(
      "Tu clave de Claude no es válida. Revisa la configuración."
    );
  });

  it("throws a Spanish error on RateLimitError", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mockCreate.mockRejectedValue(new (Anthropic as unknown as { RateLimitError: new () => Error }).RateLimitError());
    await expect(categorizeExpense(API_KEY, "algo")).rejects.toThrow(
      "Límite de uso alcanzado. Intenta en unos minutos."
    );
  });

  it("throws a Spanish error on APIConnectionError", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mockCreate.mockRejectedValue(new (Anthropic as unknown as { APIConnectionError: new () => Error }).APIConnectionError());
    await expect(categorizeExpense(API_KEY, "algo")).rejects.toThrow(
      "Error de conexión. Intenta de nuevo."
    );
  });

  it("throws a generic Spanish error for unknown API failures", async () => {
    mockCreate.mockRejectedValue(new Error("unexpected failure"));
    await expect(categorizeExpense(API_KEY, "algo")).rejects.toThrow(
      "Error al categorizar. Intenta de nuevo."
    );
  });
});
