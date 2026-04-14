import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetList } from "~/components/budget/BudgetList";
import type { Budget } from "~/types/budget";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(() => vi.fn()),
}));
vi.mock("~/lib/firestore.budgets.client", () => ({
  subscribeToBudgets: vi.fn(() => vi.fn()),
  deleteBudget: vi.fn(),
}));
vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { subscribeToBudgets, deleteBudget } from "~/lib/firestore.budgets.client";
import { subscribeToExpenses } from "~/lib/firestore.client";

const mockSubscribeBudgets = subscribeToBudgets as Mock;
const mockSubscribeExpenses = subscribeToExpenses as Mock;
const mockDeleteBudget = deleteBudget as Mock;

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

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscribeExpenses.mockImplementation((_uid: string, cb: (e: unknown[]) => void) => {
    cb([]);
    return vi.fn();
  });
});

describe("BudgetList", () => {
  it("shows empty state with 'Nuevo presupuesto' button when no budgets", () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([]);
      return vi.fn();
    });
    render(<BudgetList uid="uid1" />);
    expect(screen.getByText(/aún no tienes presupuestos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo presupuesto/i })).toBeInTheDocument();
  });

  it("renders budget cards when budgets exist", () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget({ category: "Alimentación" })]);
      return vi.fn();
    });
    render(<BudgetList uid="uid1" />);
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
  });

  it("shows the BudgetForm when 'Nuevo presupuesto' is clicked", () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([]);
      return vi.fn();
    });
    render(<BudgetList uid="uid1" />);
    fireEvent.click(screen.getByRole("button", { name: /nuevo presupuesto/i }));
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });

  it("calls deleteBudget when delete button is clicked on a card", async () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget()]);
      return vi.fn();
    });
    mockDeleteBudget.mockResolvedValue(undefined);
    render(<BudgetList uid="uid1" />);
    fireEvent.click(screen.getByLabelText("Eliminar presupuesto"));
    await waitFor(() => expect(mockDeleteBudget).toHaveBeenCalledWith("uid1", "b1"));
  });

  it("shows an error message when deleteBudget fails", async () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget()]);
      return vi.fn();
    });
    mockDeleteBudget.mockRejectedValue(new Error("No tienes permiso para realizar esta acción."));
    render(<BudgetList uid="uid1" />);
    fireEvent.click(screen.getByLabelText("Eliminar presupuesto"));
    expect(await screen.findByText(/no tienes permiso/i)).toBeInTheDocument();
  });

  it("renders the period navigator with prev/next buttons", () => {
    mockSubscribeBudgets.mockImplementation((_uid: string, cb: (b: Budget[]) => void) => {
      cb([makeBudget()]);
      return vi.fn();
    });
    render(<BudgetList uid="uid1" />);
    expect(screen.getByLabelText("Período anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Período siguiente")).toBeInTheDocument();
  });
});
