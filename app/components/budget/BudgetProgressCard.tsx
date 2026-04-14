import { formatAmount } from "~/config/currency";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";
import { computeSpending, getPeriodWindow } from "~/lib/periods";

interface Props {
  budget: Budget;
  expenses: Expense[];
  referenceDate?: Date;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export function BudgetProgressCard({ budget, expenses, referenceDate, onEdit, onDelete }: Props) {
  const ref = referenceDate ?? new Date();
  const window = getPeriodWindow(budget.period, ref);
  const spent = computeSpending(expenses, budget, ref);
  const ratio = budget.amount > 0 ? spent / budget.amount : 0;
  const pct = Math.min(ratio * 100, 100);
  const isOver = spent > budget.amount;
  const remaining = budget.amount - spent;

  // Daily burn rate: days elapsed in the current window (at least 1 to avoid division by zero)
  const daysTotal = daysBetween(window.start, window.end) + 1;
  const daysElapsed = Math.max(1, Math.min(daysBetween(window.start, ref.toISOString().slice(0, 10)) + 1, daysTotal));
  const dailyBurn = spent / daysElapsed;
  const projectedTotal = dailyBurn * daysTotal;

  // Bar color
  const barColor =
    isOver
      ? "bg-red-500 dark:bg-red-400"
      : ratio >= 0.8
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-indigo-500 dark:bg-indigo-400";

  // Recent expenses that count toward this budget (up to 3)
  const windowExpenses = expenses
    .filter(
      (e) =>
        e.date >= window.start &&
        e.date <= window.end &&
        (budget.category === null || e.category === budget.category)
    )
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {budget.category ?? "Global"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{window.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(budget)}
            aria-label="Editar presupuesto"
            className="text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget.id)}
            aria-label="Eliminar presupuesto"
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatAmount(spent)} <span className="text-gray-300 dark:text-gray-600">/</span> {formatAmount(budget.amount)}
          </span>
          <span className={`text-xs font-medium ${isOver ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
            {Math.round(ratio * 100)}%
          </span>
        </div>
      </div>

      {/* Remaining / exceeded */}
      <p className={`text-sm font-medium ${isOver ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
        {isOver
          ? `${formatAmount(Math.abs(remaining))} excedido`
          : `${formatAmount(remaining)} restantes`}
      </p>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span>Promedio: {formatAmount(dailyBurn)}/día</span>
        <span
          className={
            projectedTotal > budget.amount
              ? "text-amber-500 dark:text-amber-400"
              : undefined
          }
        >
          Proyección: {formatAmount(projectedTotal)}
        </span>
      </div>

      {/* Recent expenses */}
      {windowExpenses.length > 0 && (
        <div className="border-t border-gray-50 dark:border-gray-800 pt-3 space-y-1.5">
          {windowExpenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{e.description}</span>
              <span className="text-gray-500 dark:text-gray-500 shrink-0">{formatAmount(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
