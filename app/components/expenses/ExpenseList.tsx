import { useEffect } from "react";
import { formatAmount, monthLabel } from "~/lib/helpers";
import { EXPENSES_MONTH_ELEMENTS_SLICE } from "~/config";
import { ExpenseElement } from "./ExpenseElement";
import { ExpenseEditSheet } from "./ExpenseEditSheet";
import { useExpenseList } from "./useExpenseList";

interface Props {
  uid: string;
  onLoadMore?: (
    loadMore: () => Promise<void>,
    hasMore: boolean,
    loadingMore: boolean,
  ) => void;
}

export function ExpenseList({ uid, onLoadMore }: Props) {
  const {
    loading,
    allExpenses,
    grouped,
    monthExpandedMap,
    editingExpense,
    editForm,
    deletingId,
    deleteError,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    openEdit,
    closeEdit,
    setEditField,
    handleSaveExpense,
    handleDelete,
    toggleMonth,
  } = useExpenseList(uid);

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
          <div className="overflow-hidden bg-white dark:bg-surface-raised rounded-[30px] border border-wise-border dark:border-wise-border-dark divide-y divide-wise-border dark:divide-wise-border-dark">
            {monthExpenses.slice(0, EXPENSES_MONTH_ELEMENTS_SLICE).map((expense) => (
              <ExpenseElement
                key={expense.id}
                expense={expense}
                onEdit={openEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
            {monthExpenses.length > EXPENSES_MONTH_ELEMENTS_SLICE && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: monthExpandedMap[month] ? "1fr" : "0fr",
                    transition: "grid-template-rows 0.3s ease",
                  }}
                >
                  <div className="overflow-hidden divide-y divide-wise-border dark:divide-wise-border-dark">
                    {monthExpenses.slice(EXPENSES_MONTH_ELEMENTS_SLICE).map((expense) => (
                      <ExpenseElement
                        key={expense.id}
                        expense={expense}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        deletingId={deletingId}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full px-4 py-3 text-sm font-semibold text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white transition-colors text-center"
                >
                  {monthExpandedMap[month]
                    ? "Ver menos"
                    : `Ver los ${monthExpenses.length - EXPENSES_MONTH_ELEMENTS_SLICE} restantes`}
                </button>
              </>
            )}
          </div>
        </section>
      ))}

      {deleteError && (
        <p className="text-sm text-red-500 dark:text-[#f2686d] bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {deleteError}
        </p>
      )}

      {hasMore && (
        <div className="relative flex flex-col items-stretch">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="relative z-10 flex items-center justify-center gap-2 px-5 py-4 rounded-[30px] border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-raised text-wise-gray dark:text-muted text-sm hover:text-near-black dark:hover:text-off-white disabled:opacity-40 disabled:cursor-not-allowed group transition-colors"
          >
            <span className="group-hover:translate-y-0.5 transition-transform duration-200">
              ↓
            </span>
            <span>{loadingMore ? "Cargando..." : "Ver más gastos"}</span>
          </button>
          <div className="absolute inset-x-3 inset-y-0 rounded-[30px] border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-raised translate-y-1.5 opacity-50" />
          <div className="absolute inset-x-6 inset-y-0 rounded-[30px] border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-raised translate-y-3 opacity-25" />
        </div>
      )}

      {loadMoreError && (
        <p className="text-center text-sm text-red-500 dark:text-red-400">
          {loadMoreError}
        </p>
      )}

      <ExpenseEditSheet
        open={editingExpense !== null}
        onClose={closeEdit}
        editForm={editForm}
        onChange={setEditField}
        onSave={handleSaveExpense}
      />
    </div>
  );
}