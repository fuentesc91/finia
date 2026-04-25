import { DataEditSheet } from "~/components/ui/DataEditSheet";
import { CATEGORIES, type Category } from "~/types/expense";
import { today } from "~/lib/helpers";
import type { EditFormState } from "./useExpenseList";

const INPUT_CLASS =
  "w-full rounded-xl border border-wise-border dark:border-wise-border-dark bg-white dark:bg-surface-overlay text-near-black dark:text-off-white px-4 py-3 text-sm outline-none focus:border-wise-green dark:focus:border-wise-green focus:ring-2 focus:ring-[rgba(159,232,112,0.2)] transition-all";

const LABEL_CLASS =
  "block text-sm font-semibold text-near-black dark:text-off-white mb-1.5";

interface Props {
  open: boolean;
  onClose: () => void;
  editForm: EditFormState;
  onChange: (patch: Partial<EditFormState>) => void;
  onSave: () => Promise<void>;
}

export function ExpenseEditSheet({ open, onClose, editForm, onChange, onSave }: Props) {
  return (
    <DataEditSheet open={open} onClose={onClose} title="Editar gasto" onSave={onSave}>
      <div>
        <label htmlFor="edit-description" className={LABEL_CLASS}>
          Descripción
        </label>
        <input
          id="edit-description"
          type="text"
          value={editForm.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="edit-amount" className={LABEL_CLASS}>
          Monto
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-wise-gray dark:text-muted pointer-events-none">
            MXN
          </span>
          <input
            id="edit-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={editForm.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="0.00"
            className={`${INPUT_CLASS} pl-14`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="edit-category" className={LABEL_CLASS}>
          Categoría
        </label>
        <select
          id="edit-category"
          value={editForm.category}
          onChange={(e) => onChange({ category: e.target.value as Category })}
          className={INPUT_CLASS}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="edit-date" className={LABEL_CLASS}>
          Fecha
        </label>
        <input
          id="edit-date"
          type="date"
          value={editForm.date}
          max={today()}
          onChange={(e) => onChange({ date: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
    </DataEditSheet>
  );
}