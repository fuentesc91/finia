import { useCallback, useEffect, useMemo, useState } from "react";
import {
  subscribeToExpenses,
  getExpensesPage,
  updateExpense,
  deleteExpense,
} from "~/lib/firestore.client";
import { groupByMonth, getMonthExpandedMap } from "~/lib/helpers";
import type { Expense } from "~/types/expense";
import { type Category } from "~/types/expense";
import { EXPENSES_PAGE_SIZE } from "~/config";

export interface EditFormState {
  description: string;
  amount: string;
  category: Category;
  date: string;
}

interface MonthExpandedMap {
  [month: string]: boolean;
}

export function useExpenseList(uid: string) {
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

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setEditForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
    });
  }

  function closeEdit() {
    setEditingExpense(null);
  }

  function setEditField(patch: Partial<EditFormState>) {
    setEditForm((prev) => ({ ...prev, ...patch }));
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

  function toggleMonth(month: string) {
    setIsMonthExpanded((prev) => ({
      ...prev,
      [month]: !monthExpandedMap[month],
    }));
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

  return {
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
  };
}