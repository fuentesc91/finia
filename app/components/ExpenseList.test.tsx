import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { subscribeToExpenses } from "~/lib/firestore.client";
import type { Expense } from "~/types/expense";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(),
}));

const mockSubscribe = subscribeToExpenses as Mock;

function fakeSubscribe(expenses: Expense[]) {
  mockSubscribe.mockImplementation((_uid, callback) => {
    callback(expenses);
    return vi.fn(); // unsubscribe
  });
}

const UBER: Expense = {
  id: "e1", description: "Uber", amount: 85.5,
  category: "Transporte", date: "2026-03-15", createdAt: new Date(),
};
const SUPER: Expense = {
  id: "e2", description: "Supermercado", amount: 320,
  category: "Alimentación", date: "2026-02-10", createdAt: new Date(),
};

let ExpenseList: typeof import("~/components/ExpenseList").ExpenseList;
beforeAll(async () => {
  ({ ExpenseList } = await import("~/components/ExpenseList"));
});

beforeEach(() => vi.clearAllMocks());

describe("ExpenseList", () => {
  it("renders nothing while loading (before first snapshot)", () => {
    mockSubscribe.mockImplementation(() => vi.fn()); // never calls callback
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
    // formatAmount(85.5) → "MX$85.50" or similar
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
});
