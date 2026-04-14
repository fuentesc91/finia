import type { BudgetPeriod, BudgetPeriodType, PeriodWindow, Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  // month is 1-based; new Date(year, month, 0) gives last day of that month
  return new Date(year, month, 0).getDate();
}

// ─── Window Calculators ───────────────────────────────────────────────────────

export function getMonthlyWindow(date: Date): PeriodWindow {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lastDay = daysInMonth(year, month);
  const start = toISO(year, month, 1);
  const end = toISO(year, month, lastDay);
  const label = new Date(`${start}T12:00:00`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return { start, end, label };
}

export function getWeeklyWindow(date: Date): PeriodWindow {
  const isoDate = toISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const d = new Date(`${isoDate}T12:00:00`);
  const dayOfWeek = d.getDay(); // 0=Sun … 6=Sat
  const distToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(d);
  monday.setDate(d.getDate() - distToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toISOString().slice(0, 10);
  const end = sunday.toISOString().slice(0, 10);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return { start, end, label: `${fmt(monday)} – ${fmt(sunday)}` };
}

export function getBiweeklyWindow(date: Date): PeriodWindow {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (day <= 15) {
    const start = toISO(year, month, 1);
    const end = toISO(year, month, 15);
    const monthName = new Date(`${start}T12:00:00`).toLocaleDateString("es-MX", { month: "short" });
    return { start, end, label: `1–15 ${monthName}` };
  }

  const lastDay = daysInMonth(year, month);
  const start = toISO(year, month, 16);
  const end = toISO(year, month, lastDay);
  const monthName = new Date(`${start}T12:00:00`).toLocaleDateString("es-MX", { month: "short" });
  return { start, end, label: `16–${lastDay} ${monthName}` };
}

// ─── Strategy Interface & Registry ───────────────────────────────────────────

export interface PeriodStrategy {
  getWindow(referenceDate: Date): PeriodWindow;
  /** Human-readable name for UI selectors */
  label: string;
}

export const PERIOD_REGISTRY: Record<BudgetPeriodType, PeriodStrategy> = {
  weekly: { getWindow: getWeeklyWindow, label: "Semanal" },
  biweekly: { getWindow: getBiweeklyWindow, label: "Quincenal" },
  monthly: { getWindow: getMonthlyWindow, label: "Mensual" },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getPeriodWindow(
  period: BudgetPeriod,
  referenceDate: Date = new Date()
): PeriodWindow {
  return PERIOD_REGISTRY[period.type].getWindow(referenceDate);
}

export function isDateInWindow(dateStr: string, window: PeriodWindow): boolean {
  return dateStr >= window.start && dateStr <= window.end;
}

export function computeSpending(
  expenses: Expense[],
  budget: Budget,
  referenceDate: Date = new Date()
): number {
  const window = getPeriodWindow(budget.period, referenceDate);
  return expenses
    .filter(
      (e) =>
        isDateInWindow(e.date, window) &&
        (budget.category === null || e.category === budget.category)
    )
    .reduce((sum, e) => sum + e.amount, 0);
}
