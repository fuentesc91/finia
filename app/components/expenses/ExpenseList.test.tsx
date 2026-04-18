import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  type Mock,
} from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { subscribeToExpenses, getExpensesPage, deleteExpense, updateExpense } from "~/lib/firestore.client";
import type { Expense } from "~/types/expense";
import { EXPENSES_PAGE_SIZE } from "~/lib/configs";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(),
  getExpensesPage: vi.fn(),
  deleteExpense: vi.fn(),
  updateExpense: vi.fn(),
}));
vi.mock("~/components/ui/SwipeableRow", () => ({
  SwipeableRow: ({ children, onTap, actions, disabled }: {
    children: React.ReactNode;
    onTap?: () => void;
    actions: Array<{ label: string; onAction: () => void }>;
    disabled?: boolean;
  }) => (
    <div data-testid="swipeable-row">
      <div
        data-testid="row-content"
        data-disabled={disabled}
        onClick={onTap}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
      {actions.map((a, i) => (
        <button key={i} data-testid={`action-${i}`} onClick={a.onAction}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("~/components/ui/DataEditSheet", () => ({
  DataEditSheet: ({ open, onClose, title, onSave, children }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    onSave: () => Promise<void>;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="data-edit-sheet">
        {title && <span data-testid="sheet-title">{title}</span>}
        {children}
        <button data-testid="sheet-save" onClick={() => onSave()}>Guardar</button>
        <button data-testid="sheet-cancel" onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
}));

const mockSubscribe = subscribeToExpenses as Mock;
const mockGetPage = getExpensesPage as Mock;
const mockDelete = deleteExpense as Mock;
const mockUpdate = updateExpense as Mock;

function fakeSubscribe(expenses: Expense[]) {
  mockSubscribe.mockImplementation((_uid, callback) => {
    callback(expenses);
    return vi.fn();
  });
}

function makeExpense(
  id: string,
  date = "2026-03-15",
  createdAt = new Date("2026-03-15T10:00:00Z"),
): Expense {
  return {
    id,
    description: `Gasto ${id}`,
    amount: 100,
    category: "Transporte",
    date,
    createdAt,
  };
}

const UBER: Expense = {
  ...makeExpense("e1"),
  description: "Uber",
  category: "Transporte",
  amount: 85.5,
};
const SUPER: Expense = {
  ...makeExpense("e2", "2026-02-10", new Date("2026-02-10T10:00:00Z")),
  description: "Supermercado",
  category: "Alimentación",
  amount: 320,
};

let ExpenseList: typeof import("~/components/expenses/ExpenseList").ExpenseList;
beforeAll(async () => {
  ({ ExpenseList } = await import("~/components/expenses/ExpenseList"));
});

beforeEach(() => vi.clearAllMocks());

describe("ExpenseList", () => {
  it("renders nothing while loading (before first snapshot)", () => {
    mockSubscribe.mockImplementation(() => vi.fn());
    const { container } = render(<ExpenseList uid="u1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows empty state message when there are no expenses", () => {
    fakeSubscribe([]);
    render(<ExpenseList uid="u1" />);
    expect(
      screen.getByText(/aún no tienes gastos registrados/i),
    ).toBeInTheDocument();
  });

  it("renders expense descriptions", () => {
    fakeSubscribe([UBER, SUPER]);
    render(<ExpenseList uid="u1" />);
    expect(screen.getByText("Uber")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("groups expenses by month with headings", () => {
    fakeSubscribe([UBER, SUPER]);
    render(<ExpenseList uid="u1" />);
    expect(screen.getByText(/marzo.*2026/i)).toBeInTheDocument();
    expect(screen.getByText(/febrero.*2026/i)).toBeInTheDocument();
  });

  it("shows formatted totals per month", () => {
    fakeSubscribe([UBER]);
    render(<ExpenseList uid="u1" />);
    expect(screen.getAllByText(/\$85\.50/).length).toBeGreaterThan(0);
  });

  it("shows category badge for each expense", () => {
    fakeSubscribe([UBER]);
    render(<ExpenseList uid="u1" />);
    expect(screen.getByText("Transporte")).toBeInTheDocument();
  });

  it("calls unsubscribe on unmount", () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockImplementation((_uid, callback) => {
      callback([]);
      return unsubscribe;
    });
    const { unmount } = render(<ExpenseList uid="u1" />);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("re-subscribes when uid changes", () => {
    fakeSubscribe([]);
    const { rerender } = render(<ExpenseList uid="u1" />);
    rerender(<ExpenseList uid="u2" />);
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe.mock.calls[1][0]).toBe("u2");
  });

  describe("pagination", () => {
    it("passes pageSize=EXPENSES_PAGE_SIZE to subscribeToExpenses", () => {
      fakeSubscribe([]);
      render(<ExpenseList uid="u1" />);
      expect(mockSubscribe).toHaveBeenCalledWith(
        "u1",
        expect.any(Function),
        expect.any(Function),
        EXPENSES_PAGE_SIZE,
      );
    });

    it("reports hasMore=false when subscription returns fewer than EXPENSES_PAGE_SIZE expenses", () => {
      fakeSubscribe([UBER, SUPER]);
      let capturedHasMore = true;
      render(
        <ExpenseList
          uid="u1"
          onLoadMore={(_fn, hasMore) => {
            capturedHasMore = hasMore;
          }}
        />,
      );
      expect(capturedHasMore).toBe(false);
    });

    it("reports hasMore=true when subscription returns exactly EXPENSES_PAGE_SIZE expenses", () => {
      const expenses = Array.from({ length: EXPENSES_PAGE_SIZE }, (_, i) =>
        makeExpense(`e${i}`),
      );
      fakeSubscribe(expenses);
      let capturedHasMore = false;
      render(
        <ExpenseList
          uid="u1"
          onLoadMore={(_fn, hasMore) => {
            capturedHasMore = hasMore;
          }}
        />,
      );
      expect(capturedHasMore).toBe(true);
    });

    it("loadMore fetches next page using last expense as cursor and appends results", async () => {
      const older = {
        ...makeExpense("e-old", "2025-12-01", new Date("2025-12-01T10:00:00Z")),
        description: "Gasto antiguo",
      };
      mockGetPage.mockResolvedValueOnce({ expenses: [older], hasMore: false });
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      const onLoadMore = vi.fn((fn: () => Promise<void>) => {
        capturedLoadMore = fn;
      });
      render(<ExpenseList uid="u1" onLoadMore={onLoadMore} />);

      await act(async () => {
        await capturedLoadMore?.();
      });

      expect(mockGetPage).toHaveBeenCalledWith(
        "u1",
        UBER.createdAt,
        EXPENSES_PAGE_SIZE,
      );
      expect(screen.getByText("Gasto antiguo")).toBeInTheDocument();
    });

    it("sets hasMore=false after loading last page", async () => {
      mockGetPage.mockResolvedValueOnce({
        expenses: [makeExpense("e-old", "2025-12-01")],
        hasMore: false,
      });
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      let capturedHasMore = true;
      render(
        <ExpenseList
          uid="u1"
          onLoadMore={(fn, hasMore) => {
            capturedLoadMore = fn;
            capturedHasMore = hasMore;
          }}
        />,
      );

      await act(async () => {
        await capturedLoadMore?.();
      });

      expect(capturedHasMore).toBe(false);
    });

    it("shows error message when loadMore fails", async () => {
      mockGetPage.mockRejectedValueOnce(new Error("Sin conexión"));
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      const onLoadMore = vi.fn((fn: () => Promise<void>) => {
        capturedLoadMore = fn;
      });
      render(<ExpenseList uid="u1" onLoadMore={onLoadMore} />);

      await act(async () => {
        await capturedLoadMore?.();
      });

      expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    });

    it("resets moreExpenses when uid changes", () => {
      const older = {
        ...makeExpense("e-old", "2025-12-01"),
        description: "Gasto antiguo",
      };
      mockGetPage.mockResolvedValueOnce({ expenses: [older], hasMore: false });

      // Start with UBER, then change uid — older expenses from load-more should disappear
      fakeSubscribe([UBER]);
      const { rerender } = render(<ExpenseList uid="u1" />);

      fakeSubscribe([SUPER]);
      rerender(<ExpenseList uid="u2" />);

      expect(screen.queryByText("Gasto antiguo")).not.toBeInTheDocument();
    });
  });

  describe("edit and delete", () => {
    it("tapping a row opens DataEditSheet with title 'Editar gasto'", () => {
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      expect(screen.queryByTestId("data-edit-sheet")).not.toBeInTheDocument();

      fireEvent.click(screen.getAllByTestId("row-content")[0]);

      expect(screen.getByTestId("data-edit-sheet")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-title")).toHaveTextContent("Editar gasto");
    });

    it("DataEditSheet is closed when editingExpense is null initially", () => {
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);
      expect(screen.queryByTestId("data-edit-sheet")).not.toBeInTheDocument();
    });

    it("clicking delete action calls deleteExpense with correct uid and id", async () => {
      mockDelete.mockResolvedValue(undefined);
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      await act(async () => {
        fireEvent.click(screen.getAllByTestId("action-0")[0]);
      });

      expect(mockDelete).toHaveBeenCalledWith("u1", UBER.id);
    });

    it("shows delete error when deleteExpense rejects", async () => {
      mockDelete.mockRejectedValue(new Error("Sin conexión"));
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      await act(async () => {
        fireEvent.click(screen.getAllByTestId("action-0")[0]);
      });

      expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    });

    it("row is disabled while delete is in-flight", async () => {
      let resolveDelete!: () => void;
      mockDelete.mockReturnValue(new Promise<void>((r) => { resolveDelete = r; }));
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      fireEvent.click(screen.getAllByTestId("action-0")[0]);

      expect(screen.getAllByTestId("row-content")[0]).toHaveAttribute("data-disabled", "true");

      await act(async () => { resolveDelete(); });
    });

    it("edit sheet pre-fills description field from expense", () => {
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      fireEvent.click(screen.getAllByTestId("row-content")[0]);

      const descInput = screen.getByLabelText(/descripción/i) as HTMLInputElement;
      expect(descInput.value).toBe(UBER.description);
    });

    it("edit sheet onSave calls updateExpense with correct payload", async () => {
      mockUpdate.mockResolvedValue(undefined);
      fakeSubscribe([UBER]);
      render(<ExpenseList uid="u1" />);

      fireEvent.click(screen.getAllByTestId("row-content")[0]);

      await act(async () => {
        fireEvent.click(screen.getByTestId("sheet-save"));
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        "u1",
        UBER.id,
        expect.objectContaining({ description: UBER.description, amount: UBER.amount }),
      );
    });

    it("resets editingExpense and deletingId when uid changes", () => {
      fakeSubscribe([UBER]);
      const { rerender } = render(<ExpenseList uid="u1" />);
      fireEvent.click(screen.getAllByTestId("row-content")[0]);
      expect(screen.getByTestId("data-edit-sheet")).toBeInTheDocument();

      fakeSubscribe([SUPER]);
      rerender(<ExpenseList uid="u2" />);

      expect(screen.queryByTestId("data-edit-sheet")).not.toBeInTheDocument();
    });
  });
});
