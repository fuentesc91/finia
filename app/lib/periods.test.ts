import { describe, it, expect } from "vitest";
import {
  getMonthlyWindow,
  getWeeklyWindow,
  getBiweeklyWindow,
  getPeriodWindow,
  isDateInWindow,
  computeSpending,
  PERIOD_REGISTRY,
} from "~/lib/periods";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function d(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function makeExpense(overrides: Partial<Expense> & { date: string; amount: number }): Expense {
  return {
    id: "e1",
    description: "test",
    category: "Alimentación",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> & Pick<Budget, "period" | "amount">): Budget {
  return {
    id: "b1",
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── getMonthlyWindow ─────────────────────────────────────────────────────────

describe("getMonthlyWindow", () => {
  it("returns full January (31 days)", () => {
    const w = getMonthlyWindow(d("2026-01-15"));
    expect(w.start).toBe("2026-01-01");
    expect(w.end).toBe("2026-01-31");
  });

  it("returns full April (30 days)", () => {
    const w = getMonthlyWindow(d("2026-04-01"));
    expect(w.start).toBe("2026-04-01");
    expect(w.end).toBe("2026-04-30");
  });

  it("returns full February in a non-leap year (28 days)", () => {
    const w = getMonthlyWindow(d("2025-02-10"));
    expect(w.start).toBe("2025-02-01");
    expect(w.end).toBe("2025-02-28");
  });

  it("returns full February in a leap year (29 days)", () => {
    const w = getMonthlyWindow(d("2024-02-15"));
    expect(w.start).toBe("2024-02-01");
    expect(w.end).toBe("2024-02-29");
  });

  it("produces a non-empty label string", () => {
    const w = getMonthlyWindow(d("2026-04-13"));
    expect(typeof w.label).toBe("string");
    expect(w.label.length).toBeGreaterThan(0);
  });
});

// ─── getWeeklyWindow ──────────────────────────────────────────────────────────

describe("getWeeklyWindow", () => {
  it("Wednesday returns correct Mon–Sun span", () => {
    const w = getWeeklyWindow(d("2026-04-08")); // Wednesday
    expect(w.start).toBe("2026-04-06"); // Monday
    expect(w.end).toBe("2026-04-12");   // Sunday
  });

  it("Monday returns itself as start", () => {
    const w = getWeeklyWindow(d("2026-04-06"));
    expect(w.start).toBe("2026-04-06");
    expect(w.end).toBe("2026-04-12");
  });

  it("Sunday returns the preceding Monday as start", () => {
    const w = getWeeklyWindow(d("2026-04-12"));
    expect(w.start).toBe("2026-04-06");
    expect(w.end).toBe("2026-04-12");
  });

  it("handles a week crossing a month boundary", () => {
    // 2026-03-30 is Monday; week runs Mar 30 – Apr 05
    const w = getWeeklyWindow(d("2026-04-02")); // Thursday in that week
    expect(w.start).toBe("2026-03-30");
    expect(w.end).toBe("2026-04-05");
  });

  it("produces a non-empty label string", () => {
    const w = getWeeklyWindow(d("2026-04-13"));
    expect(typeof w.label).toBe("string");
    expect(w.label.length).toBeGreaterThan(0);
  });
});

// ─── getBiweeklyWindow ────────────────────────────────────────────────────────

describe("getBiweeklyWindow", () => {
  it("day 1 returns 1–15", () => {
    const w = getBiweeklyWindow(d("2026-04-01"));
    expect(w.start).toBe("2026-04-01");
    expect(w.end).toBe("2026-04-15");
  });

  it("day 15 returns 1–15", () => {
    const w = getBiweeklyWindow(d("2026-04-15"));
    expect(w.start).toBe("2026-04-01");
    expect(w.end).toBe("2026-04-15");
  });

  it("day 16 returns 16–end", () => {
    const w = getBiweeklyWindow(d("2026-04-16"));
    expect(w.start).toBe("2026-04-16");
    expect(w.end).toBe("2026-04-30");
  });

  it("last day of month returns 16–end", () => {
    const w = getBiweeklyWindow(d("2026-04-30"));
    expect(w.start).toBe("2026-04-16");
    expect(w.end).toBe("2026-04-30");
  });

  it("February second half ends on the 28th in non-leap year", () => {
    const w = getBiweeklyWindow(d("2025-02-20"));
    expect(w.start).toBe("2025-02-16");
    expect(w.end).toBe("2025-02-28");
  });

  it("February second half ends on the 29th in leap year", () => {
    const w = getBiweeklyWindow(d("2024-02-20"));
    expect(w.start).toBe("2024-02-16");
    expect(w.end).toBe("2024-02-29");
  });

  it("consecutive days in the same half return identical windows", () => {
    const w1 = getBiweeklyWindow(d("2026-04-03"));
    const w2 = getBiweeklyWindow(d("2026-04-10"));
    expect(w1).toEqual(w2);
  });

  it("produces a non-empty label string", () => {
    const w = getBiweeklyWindow(d("2026-04-13"));
    expect(typeof w.label).toBe("string");
    expect(w.label.length).toBeGreaterThan(0);
  });
});

// ─── getPeriodWindow ──────────────────────────────────────────────────────────

describe("getPeriodWindow", () => {
  it("dispatches to monthly strategy", () => {
    const ref = d("2026-04-13");
    expect(getPeriodWindow({ type: "monthly" }, ref)).toEqual(getMonthlyWindow(ref));
  });

  it("dispatches to weekly strategy", () => {
    const ref = d("2026-04-13");
    expect(getPeriodWindow({ type: "weekly" }, ref)).toEqual(getWeeklyWindow(ref));
  });

  it("dispatches to biweekly strategy", () => {
    const ref = d("2026-04-13");
    expect(getPeriodWindow({ type: "biweekly" }, ref)).toEqual(getBiweeklyWindow(ref));
  });
});

// ─── isDateInWindow ───────────────────────────────────────────────────────────

describe("isDateInWindow", () => {
  const window = { start: "2026-04-01", end: "2026-04-15", label: "" };

  it("includes the start boundary", () => {
    expect(isDateInWindow("2026-04-01", window)).toBe(true);
  });

  it("includes the end boundary", () => {
    expect(isDateInWindow("2026-04-15", window)).toBe(true);
  });

  it("includes a date in the middle", () => {
    expect(isDateInWindow("2026-04-08", window)).toBe(true);
  });

  it("excludes a date before the window", () => {
    expect(isDateInWindow("2026-03-31", window)).toBe(false);
  });

  it("excludes a date after the window", () => {
    expect(isDateInWindow("2026-04-16", window)).toBe(false);
  });
});

// ─── computeSpending ─────────────────────────────────────────────────────────

describe("computeSpending", () => {
  const ref = d("2026-04-10"); // biweekly: 1–15 apr

  it("sums expenses in the window for the matching category", () => {
    const budget = makeBudget({ period: { type: "biweekly" }, amount: 1000, category: "Alimentación" });
    const expenses = [
      makeExpense({ date: "2026-04-05", amount: 200, category: "Alimentación" }),
      makeExpense({ date: "2026-04-10", amount: 150, category: "Alimentación" }),
      makeExpense({ date: "2026-04-05", amount: 300, category: "Transporte" }), // different category
      makeExpense({ date: "2026-04-20", amount: 100, category: "Alimentación" }), // outside window
    ];
    expect(computeSpending(expenses, budget, ref)).toBe(350);
  });

  it("sums all categories when budget.category is null (global)", () => {
    const budget = makeBudget({ period: { type: "biweekly" }, amount: 2000, category: null });
    const expenses = [
      makeExpense({ date: "2026-04-05", amount: 200, category: "Alimentación" }),
      makeExpense({ date: "2026-04-10", amount: 300, category: "Transporte" }),
      makeExpense({ date: "2026-04-20", amount: 500, category: "Hogar" }), // outside window
    ];
    expect(computeSpending(expenses, budget, ref)).toBe(500);
  });

  it("returns 0 when no expenses match", () => {
    const budget = makeBudget({ period: { type: "monthly" }, amount: 1000, category: "Ropa" });
    const expenses = [
      makeExpense({ date: "2026-04-10", amount: 100, category: "Alimentación" }),
    ];
    expect(computeSpending(expenses, budget, ref)).toBe(0);
  });

  it("returns 0 for empty expense list", () => {
    const budget = makeBudget({ period: { type: "monthly" }, amount: 1000, category: null });
    expect(computeSpending([], budget, ref)).toBe(0);
  });
});

// ─── PERIOD_REGISTRY ──────────────────────────────────────────────────────────

describe("PERIOD_REGISTRY", () => {
  it("contains entries for all three period types", () => {
    expect(PERIOD_REGISTRY).toHaveProperty("weekly");
    expect(PERIOD_REGISTRY).toHaveProperty("biweekly");
    expect(PERIOD_REGISTRY).toHaveProperty("monthly");
  });

  it("each entry has a non-empty label", () => {
    for (const key of Object.keys(PERIOD_REGISTRY) as (keyof typeof PERIOD_REGISTRY)[]) {
      expect(typeof PERIOD_REGISTRY[key].label).toBe("string");
      expect(PERIOD_REGISTRY[key].label.length).toBeGreaterThan(0);
    }
  });
});
