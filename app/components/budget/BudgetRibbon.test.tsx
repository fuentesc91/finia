import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BudgetRibbon } from "~/components/budget/BudgetRibbon";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));
vi.mock("~/lib/firestore.budgets.client", () => ({
  subscribeToBudgets: vi.fn(),
}));
vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { subscribeToBudgets } from "~/lib/firestore.budgets.client";

const mockSubscribe = subscribeToBudgets as Mock;

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
});

describe("BudgetRibbon", () => {
  it("renders nothing when there are no budgets", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([]);
      return vi.fn();
    });
    const { container } = render(<BudgetRibbon uid="uid1" expenses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a pill per budget with category label", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ id: "b1", category: "Alimentación" }), makeBudget({ id: "b2", category: "Transporte" })]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" expenses={[]} />);
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
  });

  it("renders 'Global' for null category", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ category: null })]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" expenses={[]} />);
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("shows remaining when under budget", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ amount: 1000 })]);
      return vi.fn();
    });
    // Use expenses from the current month so they fall inside the monthly window
    const today = new Date().toISOString().slice(0, 10);
    const expenses = [makeExpense(today, 300)];
    render(<BudgetRibbon uid="uid1" expenses={expenses} />);
    expect(screen.getByText(/restantes/)).toBeInTheDocument();
  });

  it("shows exceeded when over budget", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ amount: 100 })]);
      return vi.fn();
    });
    const today = new Date().toISOString().slice(0, 10);
    const expenses = [makeExpense(today, 500)];
    render(<BudgetRibbon uid="uid1" expenses={expenses} />);
    expect(screen.getByText(/excedido/)).toBeInTheDocument();
  });

  it("each pill links to /budgets", () => {
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget()]);
      return vi.fn();
    });
    render(<BudgetRibbon uid="uid1" expenses={[]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/budgets");
  });

  it("updates pills when expenses change", () => {
    let capturedCallback: (b: Budget[]) => void;
    mockSubscribe.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      capturedCallback = cb;
      cb([makeBudget({ amount: 1000 })]);
      return vi.fn();
    });

    const today = new Date().toISOString().slice(0, 10);
    const { rerender } = render(<BudgetRibbon uid="uid1" expenses={[]} />);
    expect(screen.getByText(/restantes/)).toBeInTheDocument();

    rerender(<BudgetRibbon uid="uid1" expenses={[makeExpense(today, 1200)]} />);
    expect(screen.getByText(/excedido/)).toBeInTheDocument();
  });
});
