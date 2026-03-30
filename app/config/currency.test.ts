import { describe, it, expect } from "vitest";
import { DEFAULT_CURRENCY, formatAmount } from "~/config/currency";

describe("DEFAULT_CURRENCY", () => {
  it("is MXN", () => {
    expect(DEFAULT_CURRENCY).toBe("MXN");
  });
});

describe("formatAmount", () => {
  it("formats a whole number in MXN", () => {
    const result = formatAmount(100);
    expect(result).toMatch(/100/);
    expect(result).toMatch(/\$|MX/); // currency symbol present
  });

  it("formats a decimal amount", () => {
    const result = formatAmount(85.5);
    expect(result).toMatch(/85[.,]50/);
  });

  it("uses the provided currency when specified", () => {
    const result = formatAmount(100, "USD");
    // es-MX locale formats USD as "USD 100.00" or "US$100.00" depending on runtime
    expect(result).toMatch(/100/);
    expect(result.toLowerCase()).toMatch(/usd|\$/);
  });

  it("uses MXN as default when no currency is passed", () => {
    const withDefault = formatAmount(200);
    const withExplicit = formatAmount(200, "MXN");
    expect(withDefault).toBe(withExplicit);
  });
});
