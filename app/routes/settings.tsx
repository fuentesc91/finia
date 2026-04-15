import { useState, useEffect } from "react";
import { Link, useNavigate, useFetcher } from "react-router";
import Anthropic from "@anthropic-ai/sdk";
import { useAuth } from "~/context/auth";
import { saveAnthropicKey, getAnthropicSettings, deleteAnthropicKey } from "~/lib/firestore.client";
import { validateAnthropicKey, maskAnthropicKey } from "~/lib/anthropic";
import type { Route } from "./+types/settings";

// Server-side action: verifies the API key with Anthropic
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const apiKey = (formData.get("apiKey") as string)?.trim();

  if (!apiKey) {
    return { valid: false, hasCredits: false, error: "Clave requerida." };
  }

  const client = new Anthropic({ apiKey });
  try {
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return { valid: true, hasCredits: true };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { valid: false, hasCredits: false, error: "Clave inválida. Verifica que la copiaste correctamente." };
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return { valid: false, hasCredits: false, error: "La clave no tiene permisos suficientes." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { valid: true, hasCredits: true };
    }
    if (err instanceof Anthropic.BadRequestError) {
      // Key is authenticated — common cause is insufficient credits
      return { valid: true, hasCredits: false };
    }
    return { valid: false, hasCredits: false, error: "No se pudo verificar la clave. Intenta de nuevo." };
  }
}

export function meta() {
  return [{ title: "Finia — Configuración" }];
}

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [hasCredits, setHasCredits] = useState<boolean>(true);
  const [inputKey, setInputKey] = useState("");
  const [pendingKey, setPendingKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingKey(true);
    getAnthropicSettings(user.uid)
      .then((settings) => {
        setCurrentKey(settings?.apiKey ?? null);
        setHasCredits(settings?.hasCredits ?? true);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingKey(false));
  }, [user]);

  // Auto-clear success/warning after 4 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(""), 4000);
    return () => clearTimeout(t);
  }, [warning]);

  // Handle verification result from server action
  useEffect(() => {
    if (!fetcher.data || fetcher.state !== "idle") return;

    if (fetcher.data.valid) {
      const hasCreditsResult = fetcher.data.hasCredits;
      setSaving(true);
      saveAnthropicKey(user!.uid, pendingKey, hasCreditsResult) // user is non-null: auth guard above guarantees it
        .then(() => {
          setCurrentKey(pendingKey);
          setHasCredits(hasCreditsResult);
          setInputKey("");
          setPendingKey("");
          if (hasCreditsResult) {
            setSuccess("Clave verificada y guardada correctamente.");
          } else {
            setWarning("Clave guardada, pero tu cuenta no tiene créditos. Agrégalos en console.anthropic.com para usar la categorización.");
          }
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setSaving(false));
    } else {
      setError(fetcher.data.error ?? "Error al verificar la clave.");
      setSaving(false);
    }
  }, [fetcher.data, fetcher.state]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");

    const { valid, error: validationError } = validateAnthropicKey(inputKey);
    if (!valid) {
      setError(validationError!);
      return;
    }

    setSaving(true);
    const trimmed = inputKey.trim();
    setPendingKey(trimmed);
    const formData = new FormData();
    formData.append("apiKey", trimmed);
    fetcher.submit(formData, { method: "POST", action: "/settings" });
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setError("");
    setSuccess("");
    setWarning("");
    setDeleting(true);
    try {
      await deleteAnthropicKey(user!.uid); // user is non-null: auth guard above guarantees it
      setCurrentKey(null);
      setHasCredits(true);
      setDeleteConfirm(false);
      setSuccess("Claude desconectado.");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-near-black">
        <div className="w-8 h-8 border-2 border-wise-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isVerifying = fetcher.state !== "idle";
  const isBusy = saving || isVerifying;

  const connectionBadge = () => {
    if (!currentKey) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#ffd11a]">
          No conectado
        </span>
      );
    }
    if (!hasCredits) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#ffd11a]">
          Sin créditos
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-wise-mint dark:bg-[rgba(159,232,112,0.08)] text-[#054d28] dark:text-[#4caf7d]">
        ✓ Conectado
      </span>
    );
  };

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
        <h1 className="text-xl font-bold text-near-black dark:text-off-white">Configuración</h1>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-6">
        <div className="bg-white dark:bg-surface-raised rounded-[30px] border border-wise-border dark:border-wise-border-dark p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <span className="font-semibold text-near-black dark:text-off-white">Claude</span>
            </div>
            {!loadingKey && connectionBadge()}
          </div>

          <p className="text-sm text-wise-gray dark:text-muted mb-4">
            Ingresa tu clave de API de Anthropic para que Finia pueda categorizar tus gastos automáticamente.{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark-green dark:text-wise-green hover:underline"
            >
              Obtener clave →
            </a>
          </p>

          {/* Current key display */}
          {!loadingKey && currentKey && (
            <div className="mb-5 flex items-center justify-between rounded-xl bg-wise-mint/30 dark:bg-surface-overlay border border-wise-border dark:border-wise-border-dark px-4 py-3">
              <div>
                <p className="text-xs text-wise-gray dark:text-muted mb-0.5">Clave actual</p>
                <p className="font-mono text-sm text-near-black dark:text-off-white">{maskAnthropicKey(currentKey)}</p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`text-sm transition-colors disabled:opacity-50 ${
                  deleteConfirm
                    ? "text-red-600 dark:text-[#f2686d] font-semibold"
                    : "text-wise-gray dark:text-muted hover:text-red-500 dark:hover:text-[#f2686d]"
                }`}
              >
                {deleting ? "Eliminando..." : deleteConfirm ? "¿Confirmar?" : "Eliminar"}
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-semibold text-near-black dark:text-off-white mb-1.5">
                {currentKey ? "Actualizar clave" : "Ingresar clave de API"}
              </label>
              <textarea
                id="apiKey"
                autoComplete="off"
                spellCheck={false}
                rows={4}
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setDeleteConfirm(false); }}
                placeholder="sk-ant-..."
                className="w-full resize-none rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white placeholder-wise-gray dark:placeholder-muted px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all font-mono leading-relaxed"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-[#f2686d] bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {warning && (
              <p className="text-sm text-amber-700 dark:text-[#ffd11a] bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
                {warning}
              </p>
            )}
            {success && (
              <p className="text-sm text-[#054d28] dark:text-[#4caf7d] bg-wise-mint dark:bg-[rgba(159,232,112,0.08)] rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy || !inputKey.trim()}
              className="w-full bg-wise-green hover:scale-105 active:scale-95 text-dark-green font-semibold rounded-full py-3 text-sm transition-all disabled:opacity-50"
            >
              {isVerifying ? "Verificando..." : saving ? "Guardando..." : "Verificar y guardar"}
            </button>
          </form>
        </div>
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
