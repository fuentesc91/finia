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
      <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
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
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide capitalize">
              {monthLabel(month)}
            </h2>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatAmount(monthExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
            {monthExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {expense.category}
                </span>
                <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">
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
