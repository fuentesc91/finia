import type { Category } from "~/types/expense";

export type BudgetPeriod =
  | { type: "weekly" }
  | { type: "biweekly" }
  | { type: "monthly" };

export type BudgetPeriodType = BudgetPeriod["type"];

export interface PeriodWindow {
  start: string; // "YYYY-MM-DD" inclusive
  end: string;   // "YYYY-MM-DD" inclusive
  label: string; // human-readable in es-MX locale
}

export interface Budget {
  id: string;
  period: BudgetPeriod;
  /** null means global — covers all categories combined */
  category: Category | null;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetInput = Omit<Budget, "id" | "createdAt" | "updatedAt">;
