import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeToExpenses, getExpensesPage } from "~/lib/firestore.client";
import { formatAmount } from "~/config/currency";
import { groupByMonth, monthLabel, formatDate } from "~/lib/helpers";
import type { Expense } from "~/types/expense";

const PAGE_SIZE = 30;

interface Props {
  uid: string;
  onLoadMore?: (loadMore: () => Promise<void>, hasMore: boolean, loadingMore: boolean) => void;
}

export function ExpenseList({ uid, onLoadMore }: Props) {
  const [liveExpenses, setLiveExpenses] = useState<Expense[]>([]);
  const [moreExpenses, setMoreExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    setMoreExpenses([]);
    const unsubscribe = subscribeToExpenses(
      uid,
      (loaded) => {
        setLiveExpenses(loaded);
        setHasMore(loaded.length === PAGE_SIZE);
        setLoading(false);
      },
      () => setLoading(false),
      PAGE_SIZE,
    );
    return unsubscribe;
  }, [uid]);

  const allExpenses = useMemo(
    () => [...liveExpenses, ...moreExpenses],
    [liveExpenses, moreExpenses],
  );

  const loadMore = useCallback(async () => {
    const cursor = allExpenses.at(-1)?.createdAt;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const { expenses, hasMore: more } = await getExpensesPage(uid, cursor, PAGE_SIZE);
      setMoreExpenses((prev) => [...prev, ...expenses]);
      setHasMore(more);
    } catch (err) {
      setLoadMoreError(err instanceof Error ? err.message : "Error al cargar más gastos");
    } finally {
      setLoadingMore(false);
    }
  }, [uid, allExpenses, loadingMore]);

  useEffect(() => {
    onLoadMore?.(loadMore, hasMore, loadingMore);
  }, [onLoadMore, loadMore, hasMore, loadingMore]);

  if (loading) return null;

  if (allExpenses.length === 0) {
    return (
      <p className="text-center text-sm text-wise-gray dark:text-muted py-8">
        Aún no tienes gastos registrados. ¡Empieza arriba!
      </p>
    );
  }

  const grouped = groupByMonth(allExpenses);

  return (
    <div className="space-y-6">
      {grouped.map(([month, monthExpenses]) => (
        <section key={month}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-wise-gray dark:text-muted uppercase tracking-wide">
              {monthLabel(month)}
            </h2>
            <span className="text-sm font-semibold text-near-black dark:text-off-white">
              {formatAmount(
                monthExpenses.reduce((sum, e) => sum + e.amount, 0),
              )}
            </span>
          </div>
          <div className="bg-white dark:bg-surface-raised rounded-[30px] border border-wise-border dark:border-wise-border-dark divide-y divide-wise-border dark:divide-wise-border-dark">
            {monthExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 px-5 py-4"
              >
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
      {loadMoreError && (
        <p className="text-center text-sm text-red-500 dark:text-red-400">
          {loadMoreError}
        </p>
      )}
    </div>
  );
}
