import { useEffect, useState } from "react";
import { subscribeToExpenses } from "~/lib/firestore.client";
import { formatAmount } from "~/config/currency";
import type { Expense } from "~/types/expense";

interface Props {
  uid: string;
}

export function ExpenseList({ uid }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToExpenses(
      uid,
      (loaded) => {
        setExpenses(loaded);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [uid]);

  if (loading) return null;

  if (expenses.length === 0) {
    return (
      <p className="text-center text-sm text-wise-gray dark:text-muted py-8">
        Aún no tienes gastos registrados. ¡Empieza arriba!
      </p>
    );
  }

  const grouped = groupByMonth(expenses);

  return (
    <div className="space-y-6">
      {grouped.map(([month, monthExpenses]) => (
        <section key={month}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-wise-gray dark:text-muted uppercase tracking-wide capitalize">
              {monthLabel(month)}
            </h2>
            <span className="text-sm font-semibold text-near-black dark:text-off-white">
              {formatAmount(monthExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </span>
          </div>
          <div className="bg-white dark:bg-surface-raised rounded-[30px] border border-wise-border dark:border-wise-border-dark divide-y divide-wise-border dark:divide-wise-border-dark">
            {monthExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-near-black dark:text-off-white truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-wise-gray dark:text-muted mt-0.5">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-wise-mint dark:bg-[rgba(159,232,112,0.08)] text-dark-green dark:text-wise-green">
                  {expense.category}
                </span>
                <span className="shrink-0 text-sm font-semibold text-near-black dark:text-off-white">
                  {formatAmount(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByMonth(expenses: Expense[]): [string, Expense[]][] {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

function monthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-15`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
