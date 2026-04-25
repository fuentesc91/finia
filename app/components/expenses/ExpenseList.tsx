import { useCallback, useEffect, useMemo, useState } from "react";
import {
  subscribeToExpenses,
  getExpensesPage,
  updateExpense,
  deleteExpense,
} from "~/lib/firestore.client";
import { formatAmount } from "~/lib/helpers";
import {
  groupByMonth,
  monthLabel,
  today,
  getMonthExpandedMap,
} from "~/lib/helpers";
import type { Expense } from "~/types/expense";
import { CATEGORIES, type Category } from "~/types/expense";
import { EXPENSES_PAGE_SIZE, EXPENSES_MONTH_ELEMENTS_SLICE } from "~/config";
import { ExpenseElement } from "./ExpenseElement";
import { DataEditSheet } from "~/components/ui/DataEditSheet";

interface Props {
  uid: string;
  onLoadMore?: (
    loadMore: () => Promise<void>,
    hasMore: boolean,
    loadingMore: boolean,
  ) => void;
}

interface EditFormState {
  description: string;
  amount: string;
  category: Category;
  date: string;
}

interface MonthExpandedMap {
  [month: string]: boolean;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all";

const LABEL_CLASS =
  "block text-sm font-semibold text-near-black dark:text-off-white mb-1.5";

export function ExpenseList({ uid, onLoadMore }: Props) {
  const [liveExpenses, setLiveExpenses] = useState<Expense[]>([]);
  const [moreExpenses, setMoreExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    description: "",
    amount: "",
    category: "Otros",
    date: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isMonthExpanded, setIsMonthExpanded] = useState<MonthExpandedMap>({});

  useEffect(() => {
    setMoreExpenses([]);
    setEditingExpense(null);
    setDeletingId(null);
    setDeleteError(null);
    const unsubscribe = subscribeToExpenses(
      uid,
      (loaded) => {
        setLiveExpenses(loaded);
        setHasMore(loaded.length === EXPENSES_PAGE_SIZE);
        setLoading(false);
      },
      () => setLoading(false),
      EXPENSES_PAGE_SIZE,
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
      const { expenses, hasMore: more } = await getExpensesPage(
        uid,
        cursor,
        EXPENSES_PAGE_SIZE,
      );
      setMoreExpenses((prev) => [...prev, ...expenses]);
      setHasMore(more);
    } catch (err) {
      setLoadMoreError(
        err instanceof Error ? err.message : "Error al cargar más gastos",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [uid, allExpenses, loadingMore]);

  useEffect(() => {
    onLoadMore?.(loadMore, hasMore, loadingMore);
  }, [onLoadMore, loadMore, hasMore, loadingMore]);

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setEditForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
    });
  }

  async function handleSaveExpense() {
    const description = editForm.description.trim();
    if (!description) throw new Error("La descripción no puede estar vacía.");

    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0)
      throw new Error("Ingresa un monto válido mayor a 0.");

    if (!editForm.date) throw new Error("Selecciona una fecha.");

    const updates = {
      description,
      amount,
      category: editForm.category,
      date: editForm.date,
    };
    await updateExpense(uid, editingExpense!.id, updates);
    setMoreExpenses((prev) =>
      prev.map((e) => (e.id === editingExpense!.id ? { ...e, ...updates } : e)),
    );
  }

  async function handleDelete(expense: Expense) {
    setDeletingId(expense.id);
    setDeleteError(null);
    try {
      await deleteExpense(uid, expense.id);
      setMoreExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Error al eliminar gasto",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = useMemo(() => groupByMonth(allExpenses), [allExpenses]);

  const monthExpandedMap = useMemo(() => {
    const defaults = getMonthExpandedMap(grouped);
    return Object.fromEntries(
      Object.keys(defaults).map((month) => [
        month,
        isMonthExpanded[month] ?? defaults[month],
      ]),
    );
  }, [grouped, isMonthExpanded]);

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
                  onClick={() =>
                    setIsMonthExpanded((prev) => ({
                      ...prev,
                      [month]: !monthExpandedMap[month],
                    }))
                  }
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

      <DataEditSheet
        open={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        title="Editar gasto"
        onSave={handleSaveExpense}
      >
        <div>
          <label htmlFor="edit-description" className={LABEL_CLASS}>
            Descripción
          </label>
          <input
            id="edit-description"
            type="text"
            value={editForm.description}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, description: e.target.value }))
            }
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="edit-amount" className={LABEL_CLASS}>
            Monto
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-wise-gray dark:text-muted pointer-events-none">
              MXN
            </span>
            <input
              id="edit-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={editForm.amount}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              className={`${INPUT_CLASS} pl-14`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-category" className={LABEL_CLASS}>
            Categoría
          </label>
          <select
            id="edit-category"
            value={editForm.category}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                category: e.target.value as Category,
              }))
            }
            className={INPUT_CLASS}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-date" className={LABEL_CLASS}>
            Fecha
          </label>
          <input
            id="edit-date"
            type="date"
            value={editForm.date}
            max={today()}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, date: e.target.value }))
            }
            className={INPUT_CLASS}
          />
        </div>
      </DataEditSheet>
    </div>
  );
}
