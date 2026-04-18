import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  type Mock,
} from "vitest";
import { render, screen, act } from "@testing-library/react";
import { subscribeToExpenses, getExpensesPage } from "~/lib/firestore.client";
import type { Expense } from "~/types/expense";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(),
  getExpensesPage: vi.fn(),
}));

const mockSubscribe = subscribeToExpenses as Mock;
const mockGetPage = getExpensesPage as Mock;

function fakeSubscribe(expenses: Expense[]) {
  mockSubscribe.mockImplementation((_uid, callback) => {
    callback(expenses);
    return vi.fn();
  });
}

function makeExpense(id: string, date = "2026-03-15", createdAt = new Date("2026-03-15T10:00:00Z")): Expense {
  return { id, description: `Gasto ${id}`, amount: 100, category: "Transporte", date, createdAt };
}

const UBER: Expense = { ...makeExpense("e1"), description: "Uber", category: "Transporte", amount: 85.5 };
const SUPER: Expense = { ...makeExpense("e2", "2026-02-10", new Date("2026-02-10T10:00:00Z")), description: "Supermercado", category: "Alimentación", amount: 320 };

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
    expect(screen.getByText(/aún no tienes gastos registrados/i)).toBeInTheDocument();
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
    it("passes pageSize=30 to subscribeToExpenses", () => {
      fakeSubscribe([]);
      render(<ExpenseList uid="u1" />);
      expect(mockSubscribe).toHaveBeenCalledWith("u1", expect.any(Function), expect.any(Function), 30);
    });

    it("reports hasMore=false when subscription returns fewer than 30 expenses", () => {
      fakeSubscribe([UBER, SUPER]);
      let capturedHasMore = true;
      render(<ExpenseList uid="u1" onLoadMore={(_fn, hasMore) => { capturedHasMore = hasMore; }} />);
      expect(capturedHasMore).toBe(false);
    });

    it("reports hasMore=true when subscription returns exactly 30 expenses", () => {
      const expenses = Array.from({ length: 30 }, (_, i) => makeExpense(`e${i}`));
      fakeSubscribe(expenses);
      let capturedHasMore = false;
      render(<ExpenseList uid="u1" onLoadMore={(_fn, hasMore) => { capturedHasMore = hasMore; }} />);
      expect(capturedHasMore).toBe(true);
    });

    it("loadMore fetches next page using last expense as cursor and appends results", async () => {
      const older = { ...makeExpense("e-old", "2025-12-01", new Date("2025-12-01T10:00:00Z")), description: "Gasto antiguo" };
      mockGetPage.mockResolvedValueOnce({ expenses: [older], hasMore: false });
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      const onLoadMore = vi.fn((fn: () => Promise<void>) => { capturedLoadMore = fn; });
      render(<ExpenseList uid="u1" onLoadMore={onLoadMore} />);

      await act(async () => { await capturedLoadMore?.(); });

      expect(mockGetPage).toHaveBeenCalledWith("u1", UBER.createdAt, 30);
      expect(screen.getByText("Gasto antiguo")).toBeInTheDocument();
    });

    it("sets hasMore=false after loading last page", async () => {
      mockGetPage.mockResolvedValueOnce({ expenses: [makeExpense("e-old", "2025-12-01")], hasMore: false });
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      let capturedHasMore = true;
      render(<ExpenseList uid="u1" onLoadMore={(fn, hasMore) => { capturedLoadMore = fn; capturedHasMore = hasMore; }} />);

      await act(async () => { await capturedLoadMore?.(); });

      expect(capturedHasMore).toBe(false);
    });

    it("shows error message when loadMore fails", async () => {
      mockGetPage.mockRejectedValueOnce(new Error("Sin conexión"));
      fakeSubscribe([UBER]);

      let capturedLoadMore: (() => Promise<void>) | undefined;
      const onLoadMore = vi.fn((fn: () => Promise<void>) => { capturedLoadMore = fn; });
      render(<ExpenseList uid="u1" onLoadMore={onLoadMore} />);

      await act(async () => { await capturedLoadMore?.(); });

      expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    });

    it("resets moreExpenses when uid changes", () => {
      const older = { ...makeExpense("e-old", "2025-12-01"), description: "Gasto antiguo" };
      mockGetPage.mockResolvedValueOnce({ expenses: [older], hasMore: false });

      // Start with UBER, then change uid — older expenses from load-more should disappear
      fakeSubscribe([UBER]);
      const { rerender } = render(<ExpenseList uid="u1" />);

      fakeSubscribe([SUPER]);
      rerender(<ExpenseList uid="u2" />);

      expect(screen.queryByText("Gasto antiguo")).not.toBeInTheDocument();
    });
  });
});
