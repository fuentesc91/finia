import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "~/lib/firebase.client";
import { useAuth } from "~/context/auth";
import { getAnthropicSettings } from "~/lib/firestore.client";

export function meta() {
  return [{ title: "Finia" }];
}

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [claudeConnected, setClaudeConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    getAnthropicSettings(user.uid)
      .then((settings) => setClaudeConnected(settings !== null && settings.hasCredits))
      .catch(() => setClaudeConnected(false)); // fail silently on home page
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">finia</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            aria-label="Configuración"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <SettingsIcon />
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto">
        <p className="text-gray-700 dark:text-gray-300">
          Hola, <span className="font-medium">{user.displayName ?? user.email}</span>
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Pronto podrás registrar tus gastos aquí.</p>

        {claudeConnected === false && (
          <Link
            to="/settings"
            className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <span>✦</span>
            <span>Conecta Claude para categorizar tus gastos automáticamente.</span>
            <span className="ml-auto text-amber-500 dark:text-amber-400">→</span>
          </Link>
        )}
      </main>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
