import { useEffect, useState } from "react";
import { Link } from "react-router";
import { subscribeToBudgets } from "~/lib/firestore.budgets.client";
import { subscribeToExpensesForPeriod } from "~/lib/firestore.client";
import { computeSpending, getPeriodWindow, getMonthlyWindow } from "~/lib/periods";
import { formatAmount } from "~/config/currency";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

interface Props {
  uid: string;
}

export function BudgetRibbon({ uid }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    return subscribeToBudgets(uid, setBudgets);
  }, [uid]);

  useEffect(() => {
    const { start, end } = getMonthlyWindow(new Date());
    return subscribeToExpensesForPeriod(uid, start, end, setExpenses);
  }, [uid]);

  if (budgets.length === 0) return null;

  const now = new Date();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-wise-gray dark:text-muted uppercase tracking-wide">
        Presupuesto actual
      </p>
      <div className="flex flex-wrap gap-2">
        {budgets.map((budget) => {
          const spent = computeSpending(expenses, budget, now);
          const remaining = budget.amount - spent;
          const ratio = budget.amount > 0 ? spent / budget.amount : 0;
          const isOver = remaining < 0;

          const pillColor = isOver
            ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-[#f2686d] border-red-100 dark:border-red-900/50"
            : ratio >= 0.9
            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#ffd11a] border-amber-100 dark:border-amber-900/50"
            : "bg-wise-mint dark:bg-[rgba(159,232,112,0.08)] text-dark-green dark:text-wise-green border-wise-pastel dark:border-[rgba(159,232,112,0.30)]";

          const window = getPeriodWindow(budget.period, now);
          const label = budget.category ?? "Global";

          return (
            <Link
              key={budget.id}
              to="/budgets"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 ${pillColor}`}
            >
              <span>{label}</span>
              <span className="opacity-60">·</span>
              <span>
                {isOver
                  ? `${formatAmount(Math.abs(remaining))} excedido`
                  : `${formatAmount(remaining)} restantes`}
              </span>
              <span className="opacity-40 text-[10px]">({window.label})</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
