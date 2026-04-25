import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { getAnthropicSettings, saveExpense } from "~/lib/firestore.client";
import { DEFAULT_CURRENCY } from "~/config";
import { today } from "~/lib/helpers";
import type { Category } from "~/types/expense";

interface Props {
  uid: string;
}

type ActionData = { category: Category } | { error: string };

export function ExpenseForm({ uid }: Props) {
  const fetcher = useFetcher<ActionData>();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [claudeConnected, setClaudeConnected] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState("");
  const [actionError, setActionError] = useState("");
  const pendingRef = useRef<{ description: string; amount: number } | null>(
    null,
  );

  useEffect(() => {
    getAnthropicSettings(uid)
      .then((settings) => {
        setApiKey(settings?.apiKey ?? null);
        setClaudeConnected(settings !== null && settings.hasCredits);
      })
      .catch(() => setClaudeConnected(false));
  }, [uid]);

  // Handle action result
  useEffect(() => {
    if (!fetcher.data || fetcher.state !== "idle" || !pendingRef.current)
      return;

    const data = fetcher.data;
    const pending = pendingRef.current;
    pendingRef.current = null;

    if ("error" in data) {
      setActionError(data.error ?? "Error desconocido.");
      return;
    }

    saveExpense(uid, {
      description: pending.description,
      amount: pending.amount,
      category: data.category,
      date: today(),
    })
      .then(() => {
        setDescription("");
        setAmount("");
        setActionError("");
        setLocalError("");
      })
      .catch((err: Error) => setActionError(err.message));
  }, [fetcher.data, fetcher.state, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubmitting = fetcher.state !== "idle";
  const shownError = actionError || localError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    setActionError("");

    const trimmedDesc = description.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedDesc) {
      setLocalError("Describe el gasto.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setLocalError("Ingresa un monto válido mayor a cero.");
      return;
    }
    if (!apiKey) {
      setLocalError("Configura tu clave de Claude en Configuración.");
      return;
    }

    pendingRef.current = { description: trimmedDesc, amount: numAmount };
    const formData = new FormData();
    formData.append("description", trimmedDesc);
    formData.append("amount", String(numAmount));
    formData.append("apiKey", apiKey);
    fetcher.submit(formData, { method: "POST", action: "/expenses" });
  }

  return (
    <>
      {claudeConnected === false && (
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-[#ffd11a] transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <span>✦</span>
          <span>
            Conecta Claude para categorizar tus gastos automáticamente.
          </span>
          <span className="ml-auto text-amber-500 dark:text-[#ffd11a]">→</span>
        </Link>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-surface-raised rounded-[30px] border border-wise-border dark:border-wise-border-dark p-5 space-y-4"
      >
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-near-black dark:text-off-white mb-1.5"
          >
            Descripción
          </label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Almuerzo en restaurante, Uber al aeropuerto..."
            disabled={isSubmitting}
            className="w-full resize-none rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white placeholder-wise-gray dark:placeholder-muted px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-semibold text-near-black dark:text-off-white mb-1.5"
          >
            Monto
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-wise-gray dark:text-muted select-none">
              {DEFAULT_CURRENCY}
            </span>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white placeholder-wise-gray dark:placeholder-muted pl-14 pr-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {shownError && (
          <p className="text-sm text-red-500 dark:text-[#f2686d] bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
            {shownError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !claudeConnected}
          className="w-full bg-wise-green hover:scale-105 active:scale-95 text-dark-green font-semibold rounded-full py-3 text-sm transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Categorizando..." : "Registrar gasto"}
        </button>
      </form>
    </>
  );
}
