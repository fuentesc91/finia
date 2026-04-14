import { useState } from "react";
import { CATEGORIES } from "~/types/expense";
import type { Category } from "~/types/expense";
import type { Budget, BudgetInput, BudgetPeriodType } from "~/types/budget";
import { PERIOD_REGISTRY } from "~/lib/periods";
import { saveBudget, updateBudget } from "~/lib/firestore.budgets.client";

interface Props {
  uid: string;
  /** When provided, the form operates in edit mode */
  existing?: Budget;
  onSaved: () => void;
  onCancel: () => void;
}

export function BudgetForm({ uid, existing, onSaved, onCancel }: Props) {
  const [period, setPeriod] = useState<BudgetPeriodType>(existing?.period.type ?? "monthly");
  const [category, setCategory] = useState<Category | "global">(existing?.category ?? "global");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setError("Ingresa un monto válido mayor a 0.");
      return;
    }

    const input: BudgetInput = {
      period: { type: period },
      category: category === "global" ? null : category,
      amount: parsed,
    };

    setSaving(true);
    try {
      if (existing) {
        await updateBudget(uid, existing.id, input);
      } else {
        await saveBudget(uid, input);
      }
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const periodOptions = Object.entries(PERIOD_REGISTRY) as [BudgetPeriodType, { label: string }][];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        {existing ? "Editar presupuesto" : "Nuevo presupuesto"}
      </h3>

      {/* Period */}
      <div>
        <label htmlFor="budget-period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Período
        </label>
        <select
          id="budget-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as BudgetPeriodType)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
        >
          {periodOptions.map(([key, strategy]) => (
            <option key={key} value={key}>
              {strategy.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="budget-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Categoría
        </label>
        <select
          id="budget-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "global")}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
        >
          <option value="global">— Global (todas las categorías) —</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Límite
        </label>
        <input
          id="budget-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !amount.trim()}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : existing ? "Actualizar" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
