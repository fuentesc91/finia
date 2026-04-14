import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetForm } from "~/components/budget/BudgetForm";
import { PERIOD_REGISTRY } from "~/lib/periods";
import type { Budget } from "~/types/budget";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));
vi.mock("~/lib/firestore.budgets.client", () => ({
  saveBudget: vi.fn(),
  updateBudget: vi.fn(),
}));

import { saveBudget, updateBudget } from "~/lib/firestore.budgets.client";
import type { Mock } from "vitest";

const mockSaveBudget = saveBudget as Mock;
const mockUpdateBudget = updateBudget as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

const DEFAULT_PROPS = {
  uid: "uid1",
  onSaved: vi.fn(),
  onCancel: vi.fn(),
};

describe("BudgetForm — creation mode", () => {
  it("renders period options from PERIOD_REGISTRY", () => {
    render(<BudgetForm {...DEFAULT_PROPS} />);
    const select = screen.getByLabelText(/período/i);
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    for (const key of Object.keys(PERIOD_REGISTRY)) {
      expect(options).toContain(key);
    }
  });

  it("renders global category option mapping to null", () => {
    render(<BudgetForm {...DEFAULT_PROPS} />);
    const select = screen.getByLabelText(/categoría/i);
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain("global");
  });

  it("calls saveBudget with correct payload on valid submission", async () => {
    mockSaveBudget.mockResolvedValue("b1");
    render(<BudgetForm {...DEFAULT_PROPS} />);

    fireEvent.change(screen.getByLabelText(/período/i), { target: { value: "biweekly" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "Alimentación" } });
    fireEvent.change(screen.getByLabelText(/límite/i), { target: { value: "2000" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(mockSaveBudget).toHaveBeenCalledWith("uid1", {
        period: { type: "biweekly" },
        category: "Alimentación",
        amount: 2000,
      });
    });
    expect(DEFAULT_PROPS.onSaved).toHaveBeenCalled();
  });

  it("saves with category null when 'global' is selected", async () => {
    mockSaveBudget.mockResolvedValue("b1");
    render(<BudgetForm {...DEFAULT_PROPS} />);

    fireEvent.change(screen.getByLabelText(/límite/i), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(mockSaveBudget).toHaveBeenCalledWith("uid1", expect.objectContaining({ category: null }));
    });
  });

  it("shows an inline error when amount is empty (form submitted directly)", async () => {
    const { container } = render(<BudgetForm {...DEFAULT_PROPS} />);
    // Submit the form directly so the disabled button doesn't block validation
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText(/monto válido/i)).toBeInTheDocument();
    expect(mockSaveBudget).not.toHaveBeenCalled();
  });

  it("shows an inline error when saveBudget rejects", async () => {
    mockSaveBudget.mockRejectedValue(new Error("Servicio no disponible. Verifica tu conexión."));
    render(<BudgetForm {...DEFAULT_PROPS} />);

    fireEvent.change(screen.getByLabelText(/límite/i), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText(/servicio no disponible/i)).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<BudgetForm {...DEFAULT_PROPS} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("BudgetForm — edit mode", () => {
  const EXISTING: Budget = {
    id: "b1",
    period: { type: "weekly" },
    category: "Transporte",
    amount: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("pre-fills form fields from the existing budget", () => {
    render(<BudgetForm {...DEFAULT_PROPS} existing={EXISTING} />);
    expect((screen.getByLabelText(/período/i) as HTMLSelectElement).value).toBe("weekly");
    expect((screen.getByLabelText(/categoría/i) as HTMLSelectElement).value).toBe("Transporte");
    expect((screen.getByLabelText(/límite/i) as HTMLInputElement).value).toBe("500");
  });

  it("calls updateBudget on submission in edit mode", async () => {
    mockUpdateBudget.mockResolvedValue(undefined);
    render(<BudgetForm {...DEFAULT_PROPS} existing={EXISTING} />);

    fireEvent.change(screen.getByLabelText(/límite/i), { target: { value: "750" } });
    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    await waitFor(() => {
      expect(mockUpdateBudget).toHaveBeenCalledWith("uid1", "b1", expect.objectContaining({ amount: 750 }));
    });
  });
});
