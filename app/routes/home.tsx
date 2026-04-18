import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "~/lib/firebase.client";
import { useAuth } from "~/context/auth";
import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { ExpenseList } from "~/components/expenses/ExpenseList";
import { BudgetRibbon } from "~/components/budget/BudgetRibbon";
import { subscribeToExpenses } from "~/lib/firestore.client";
import type { Expense } from "~/types/expense";

export function meta() {
  return [{ title: "Finia" }];
}

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToExpenses(user.uid, setExpenses);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-near-black">
        <div className="w-8 h-8 border-2 border-wise-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-near-black">
      <header className="bg-white dark:bg-surface-raised border-b border-wise-border dark:border-wise-border-dark px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-near-black dark:text-wise-green">
          finia
        </h1>
        <div className="flex items-center gap-3">
          <Link
            to="/budgets"
            aria-label="Presupuestos"
            className="text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white transition-colors"
          >
            <BudgetIcon />
          </Link>
          <Link
            to="/settings"
            aria-label="Configuración"
            className="text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white transition-colors"
          >
            <SettingsIcon />
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-6">
        <p className="text-near-black dark:text-off-white">
          Hola,{" "}
          <span className="font-semibold">
            {user.displayName ?? user.email}
          </span>
        </p>
        <ExpenseForm uid={user.uid} />
        <BudgetRibbon uid={user.uid} expenses={expenses} />
        <ExpenseList uid={user.uid} />
      </main>
    </div>
  );
}

function BudgetIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-4 0v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
