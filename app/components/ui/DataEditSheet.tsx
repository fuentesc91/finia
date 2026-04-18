import { useEffect, useState } from "react";
import { BottomSheet } from "~/components/ui/BottomSheet";

interface DataEditSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
}

export function DataEditSheet({ open, onClose, title, children, onSave }: DataEditSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setError(null);
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {children}

        {error && (
          <p className="text-sm text-red-500 dark:text-[#f2686d] bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-full border border-wise-border dark:border-wise-border-dark py-3 text-sm text-near-black dark:text-off-white hover:bg-light-surface dark:hover:bg-surface-overlay transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-wise-green hover:scale-105 active:scale-95 text-dark-green font-semibold rounded-full py-3 text-sm transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
