import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/context/auth";
import { BudgetList } from "~/components/budget/BudgetList";

export function meta() {
  return [{ title: "Finia — Presupuestos" }];
}

export default function Budgets() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Volver"
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Presupuestos</h1>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto">
        <BudgetList uid={user.uid} />
      </main>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 15L7.5 10L12.5 5" />
    </svg>
  );
}
