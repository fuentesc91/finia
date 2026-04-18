import { describe, it, expect } from "vitest";
import { today, groupByMonth, monthLabel, formatDate, daysBetween, periodDays, normalizeFirestoreError } from "./helpers";
import type { Expense } from "~/types/expense";

describe("today", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches current local date", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(today()).toBe(expected);
  });
});

describe("groupByMonth", () => {
  const makeExpense = (id: string, date: string): Expense => ({
    id,
    description: "test",
    amount: 100,
    category: "Otros",
    date,
    createdAt: new Date(),
  });

  it("groups expenses by YYYY-MM key", () => {
    const expenses = [
      makeExpense("1", "2024-01-10"),
      makeExpense("2", "2024-01-20"),
      makeExpense("3", "2024-02-05"),
    ];
    const grouped = groupByMonth(expenses);
    expect(grouped).toHaveLength(2);
    expect(grouped[0][0]).toBe("2024-01");
    expect(grouped[0][1]).toHaveLength(2);
    expect(grouped[1][0]).toBe("2024-02");
    expect(grouped[1][1]).toHaveLength(1);
  });

  it("returns empty array for no expenses", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("monthLabel", () => {
  it("returns localized month and year", () => {
    const label = monthLabel("2024-01");
    expect(label).toContain("2024");
    expect(label.toLowerCase()).toContain("enero");
  });
});

describe("formatDate", () => {
  it("returns localized day and short month", () => {
    const result = formatDate("2024-03-15");
    expect(result).toMatch(/15/);
    expect(result.toLowerCase()).toContain("mar");
  });
});

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2024-01-01", "2024-01-01")).toBe(0);
  });

  it("returns correct day count", () => {
    expect(daysBetween("2024-01-01", "2024-01-08")).toBe(7);
  });

  it("returns 0 for reversed dates", () => {
    expect(daysBetween("2024-01-10", "2024-01-01")).toBe(0);
  });
});

describe("periodDays", () => {
  it("returns 7 for weekly", () => expect(periodDays("weekly")).toBe(7));
  it("returns 15 for biweekly", () => expect(periodDays("biweekly")).toBe(15));
  it("returns 30 for monthly", () => expect(periodDays("monthly")).toBe(30));
});

describe("normalizeFirestoreError", () => {
  it("maps permission-denied code", () => {
    const err = normalizeFirestoreError({ code: "permission-denied" });
    expect(err.message).toContain("permiso");
  });

  it("maps unavailable code", () => {
    const err = normalizeFirestoreError({ code: "unavailable" });
    expect(err.message).toContain("conexión");
  });

  it("falls back for unknown code", () => {
    const err = normalizeFirestoreError({ code: "unknown-code" });
    expect(err.message).toContain("datos");
  });

  it("handles non-object error", () => {
    const err = normalizeFirestoreError("some string");
    expect(err.message).toContain("desconocido");
  });
});
