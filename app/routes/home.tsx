import { useEffect } from "react";
import { useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "~/lib/firebase.client";
import { useAuth } from "~/context/auth";

export function meta() {
  return [{ title: "Finia" }];
}

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600">finia</h1>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto">
        <p className="text-gray-700">
          Hola, <span className="font-medium">{user.displayName ?? user.email}</span>
        </p>
        <p className="text-sm text-gray-400 mt-1">Pronto podrás registrar tus gastos aquí.</p>
      </main>
    </div>
  );
}
