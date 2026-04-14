import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetProgressCard } from "~/components/budget/BudgetProgressCard";
import type { Budget } from "~/types/budget";
import type { Expense } from "~/types/expense";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "b1",
    period: { type: "monthly" },
    category: "Alimentación",
    amount: 1000,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    ...overrides,
  };
}

function makeExpense(date: string, amount: number, category: Expense["category"] = "Alimentación"): Expense {
  return { id: crypto.randomUUID(), description: "test", amount, category, date, createdAt: new Date() };
}

// Fix the reference date to April 10, 2026 (day 10 of the month → monthly window = Apr 1–30)
const REF = new Date("2026-04-10T12:00:00");

describe("BudgetProgressCard", () => {
  it("renders the category name", () => {
    render(
      <BudgetProgressCard
        budget={makeBudget()}
        expenses={[]}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
  });

  it("renders 'Global' for a null category budget", () => {
    render(
      <BudgetProgressCard
        budget={makeBudget({ category: null })}
        expenses={[]}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("shows remaining amount when under budget", () => {
    const expenses = [makeExpense("2026-04-05", 300)];
    render(
      <BudgetProgressCard
        budget={makeBudget({ amount: 1000 })}
        expenses={expenses}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/restantes/)).toBeInTheDocument();
  });

  it("shows exceeded amount when over budget", () => {
    const expenses = [makeExpense("2026-04-05", 1200)];
    render(
      <BudgetProgressCard
        budget={makeBudget({ amount: 1000 })}
        expenses={expenses}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/excedido/)).toBeInTheDocument();
  });

  it("calls onEdit with the budget when edit button is clicked", () => {
    const onEdit = vi.fn();
    const budget = makeBudget();
    render(
      <BudgetProgressCard
        budget={budget}
        expenses={[]}
        referenceDate={REF}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Editar presupuesto"));
    expect(onEdit).toHaveBeenCalledWith(budget);
  });

  it("calls onDelete with the budget id when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <BudgetProgressCard
        budget={makeBudget()}
        expenses={[]}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText("Eliminar presupuesto"));
    expect(onDelete).toHaveBeenCalledWith("b1");
  });

  it("renders recent expenses in the window", () => {
    const expenses = [makeExpense("2026-04-05", 150)];
    expenses[0] = { ...expenses[0], description: "Supermercado" };
    render(
      <BudgetProgressCard
        budget={makeBudget()}
        expenses={expenses}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("does not render expenses outside the window", () => {
    const expenses = [makeExpense("2026-03-15", 150)]; // previous month
    expenses[0] = { ...expenses[0], description: "OldExpense" };
    render(
      <BudgetProgressCard
        budget={makeBudget()}
        expenses={expenses}
        referenceDate={REF}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText("OldExpense")).not.toBeInTheDocument();
  });
});
