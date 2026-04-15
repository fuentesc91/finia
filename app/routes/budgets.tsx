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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-near-black">
        <div className="w-8 h-8 border-2 border-wise-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-near-black">
      <header className="bg-white dark:bg-surface-raised border-b border-wise-border dark:border-wise-border-dark px-6 py-4 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Volver"
          className="text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white transition-colors"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-bold text-near-black dark:text-off-white">Presupuestos</h1>
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
