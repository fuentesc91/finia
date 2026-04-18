import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BudgetRibbon } from "~/components/budget/BudgetRibbon";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));
vi.mock("~/lib/firestore.budgets.client", () => ({
  subscribeToBudgets: vi.fn(),
}));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpensesForPeriod: vi.fn(() => vi.fn()),
}));
vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { subscribeToBudgets } from "~/lib/firestore.budgets.client";
import { subscribeToExpensesForPeriod } from "~/lib/firestore.client";

const mockSubscribe = subscribeToBudgets as Mock;
const mockSubscribeExpenses = subscribeToExpensesForPeriod as Mock;

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "b1",
    period: { type: "monthly" },
    category: "Alimentación",
    amount: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeExpense(date: string, amount: number, category: Expense["category"] = "Alimentación"): Expense {
  return { id: crypto.randomUUID(), description: "test", amount, category, date, createdAt: new Date() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscribeExpenses.mockImplementation(
    (_uid: string, _start: string, _end: string, cb: (e: Expense[]) => void) => {
      cb([]);
      return vi.fn();
    }
  );
});

describe("BudgetRibbon", () => {
  it("renders nothing when there are no budgets", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([]);
      return vi.fn();
    });
    const { container } = render(<BudgetRibbon uid="uid1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a pill per budget with category label", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ id: "b1", category: "Alimentación" }), makeBudget({ id: "b2", category: "Transporte" })]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" />);
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
  });

  it("renders 'Global' for null category", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ category: null })]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" />);
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("shows remaining when under budget", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ amount: 1000 })]);
      return vi.fn();
    });
    const today = new Date().toISOString().slice(0, 10);
    mockSubscribeExpenses.mockImplementation(
      (_uid: string, _start: string, _end: string, cb: (e: Expense[]) => void) => {
        cb([makeExpense(today, 300)]);
        return vi.fn();
      }
    );
    render(<BudgetRibbon uid="uid1" />);
    expect(screen.getByText(/restantes/)).toBeInTheDocument();
  });

  it("shows exceeded when over budget", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ amount: 100 })]);
      return vi.fn();
    });
    const today = new Date().toISOString().slice(0, 10);
    mockSubscribeExpenses.mockImplementation(
      (_uid: string, _start: string, _end: string, cb: (e: Expense[]) => void) => {
        cb([makeExpense(today, 500)]);
        return vi.fn();
      }
    );
    render(<BudgetRibbon uid="uid1" />);
    expect(screen.getByText(/excedido/)).toBeInTheDocument();
  });

  it("each pill links to /budgets", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget()]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/budgets");
  });

  it("updates pills when subscription delivers new expenses", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ amount: 1000 })]);
      return vi.fn();
    });
    let capturedExpenseCb: (e: Expense[]) => void;
    mockSubscribeExpenses.mockImplementation(
      (_uid: string, _start: string, _end: string, cb: (e: Expense[]) => void) => {
        capturedExpenseCb = cb;
        cb([]);
        return vi.fn();
      }
    );
    const today = new Date().toISOString().slice(0, 10);
    render(<BudgetRibbon uid="uid1" />);
    expect(screen.getByText(/restantes/)).toBeInTheDocument();
    act(() => capturedExpenseCb([makeExpense(today, 1200)]));
    expect(screen.getByText(/excedido/)).toBeInTheDocument();
  });
});
