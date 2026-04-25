import { type Expense } from "~/types/expense";
import { SwipeableRow } from "../ui/SwipeableRow";
import { formatDate } from "~/lib/helpers";
import { formatAmount } from "~/lib/helpers";

interface Props {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  deletingId: string | null;
}

export function ExpenseElement({
  expense,
  onEdit,
  onDelete,
  deletingId,
}: Props) {
  return (
    <SwipeableRow
      key={expense.id}
      disabled={deletingId === expense.id}
      onTap={() => onEdit(expense)}
      actions={[
        {
          label: "Eliminar",
          confirmedLabel: "¿Confirmar?",
          onAction: () => onDelete(expense),
          variant: "destructive",
          widthPx: 90,
        },
      ]}
    >
      <div
        className={`flex items-center gap-3 px-5 py-4 transition-opacity ${
          deletingId === expense.id ? "opacity-50" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-near-black dark:text-off-white truncate">
            {expense.description}
          </p>
          <p className="text-xs text-wise-gray dark:text-muted mt-0.5">
            {formatDate(expense.date)}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-wise-mint dark:bg-[rgba(159,232,112,0.08)] text-dark-green dark:text-wise-green">
          {expense.category}
        </span>
        <span className="shrink-0 text-sm font-semibold text-near-black dark:text-off-white">
          {formatAmount(expense.amount)}
        </span>
      </div>
    </SwipeableRow>
  );
}
