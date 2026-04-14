import { useEffect, useState } from "react";
import { subscribeToBudgets, deleteBudget } from "~/lib/firestore.budgets.client";
import { subscribeToExpenses } from "~/lib/firestore.client";
import { getPeriodWindow } from "~/lib/periods";
import { BudgetProgressCard } from "~/components/budget/BudgetProgressCard";
import { BudgetForm } from "~/components/budget/BudgetForm";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

interface Props {
  uid: string;
}

export function BudgetList({ uid }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [referenceDate, setReferenceDate] = useState(new Date());

  useEffect(() => {
    const unsubBudgets = subscribeToBudgets(uid, setBudgets, (err) => setError(err.message));
    const unsubExpenses = subscribeToExpenses(uid, setExpenses, (err) => setError(err.message));
    return () => {
      unsubBudgets();
      unsubExpenses();
    };
  }, [uid]);

  function navigatePeriod(budget: Budget, direction: -1 | 1) {
    // Move reference date by the period's approximate length
    const days = periodDays(budget.period.type);
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + direction * days);
    setReferenceDate(next);
  }

  async function handleDelete(budgetId: string) {
    setDeletingId(budgetId);
    setError("");
    try {
      await deleteBudget(uid, budgetId);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(budget: Budget) {
    setEditingBudget(budget);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingBudget(null);
  }

  if (showForm) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <BudgetForm
          uid={uid}
          existing={editingBudget ?? undefined}
          onSaved={handleFormClose}
          onCancel={handleFormClose}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Aún no tienes presupuestos configurados.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-xl px-5 py-2.5 text-sm transition-colors"
          >
            <PlusIcon />
            Nuevo presupuesto
          </button>
        </div>
      ) : (
        <>
          {/* Period navigator — operates on the first budget's period as the page-level frame */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigatePeriod(budgets[0], -1)}
              aria-label="Período anterior"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {getPeriodWindow(budgets[0].period, referenceDate).label}
            </span>
            <button
              type="button"
              onClick={() => navigatePeriod(budgets[0], 1)}
              aria-label="Período siguiente"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronRightIcon />
            </button>
          </div>

          {/* Budget cards */}
          {budgets.map((budget) => (
            <div key={budget.id} className={deletingId === budget.id ? "opacity-50 pointer-events-none" : ""}>
              <BudgetProgressCard
                budget={budget}
                expenses={expenses}
                referenceDate={referenceDate}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-4 text-sm text-gray-400 dark:text-gray-500 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            <PlusIcon />
            Nuevo presupuesto
          </button>
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodDays(type: string): number {
  if (type === "weekly") return 7;
  if (type === "biweekly") return 15;
  return 30;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 15L7.5 10L12.5 5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 5L12.5 10L7.5 15" />
    </svg>
  );
}
