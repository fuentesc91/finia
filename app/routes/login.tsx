import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "~/lib/firebase.client";
import { useAuth } from "~/context/auth";

export function meta() {
  return [{ title: "Finia — Iniciar sesión" }];
}

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <FullScreenSpinner />;

  return (
    <div className="min-h-screen bg-white dark:bg-near-black flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-near-black dark:text-wise-green tracking-tight">finia</h1>
          <p className="mt-2 text-wise-gray dark:text-muted text-sm">Tus finanzas, organizadas.</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-surface-raised rounded-[30px] shadow-sm border border-wise-border dark:border-wise-border-dark p-6">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-light-surface dark:bg-surface-overlay p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white dark:bg-surface-raised text-near-black dark:text-off-white shadow-sm"
                  : "text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-white dark:bg-surface-raised text-near-black dark:text-off-white shadow-sm"
                  : "text-wise-gray dark:text-muted hover:text-near-black dark:hover:text-off-white"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 border border-wise-border dark:border-wise-border-dark rounded-full py-3 px-4 text-sm font-semibold text-near-black dark:text-off-white hover:bg-light-surface dark:hover:bg-surface-overlay hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-wise-border dark:bg-wise-border-dark" />
            <span className="text-xs text-wise-gray dark:text-muted">o</span>
            <div className="flex-1 h-px bg-wise-border dark:bg-wise-border-dark" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-near-black dark:text-off-white mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white placeholder-wise-gray dark:placeholder-muted px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-near-black dark:text-off-white mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white placeholder-wise-gray dark:placeholder-muted px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-[#f2686d] bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-wise-green hover:scale-105 active:scale-95 text-dark-green font-semibold rounded-full py-3 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {submitting
                ? "Cargando..."
                : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-near-black">
      <div className="w-8 h-8 border-2 border-wise-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const messages: Record<string, string> = {
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/user-not-found": "No existe una cuenta con ese correo.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
      "auth/popup-closed-by-user": "Ventana cerrada. Intenta de nuevo.",
    };
    return messages[code] ?? "Ocurrió un error. Intenta de nuevo.";
  }
  return "Ocurrió un error. Intenta de nuevo.";
}
