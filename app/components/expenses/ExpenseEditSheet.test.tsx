import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EditFormState } from "./useExpenseList";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("~/components/ui/DataEditSheet", () => ({
  DataEditSheet: ({
    open,
    onClose,
    title,
    onSave,
    children,
  }: {
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
        <button data-testid="sheet-save" onClick={() => onSave()}>
          Guardar
        </button>
        <button data-testid="sheet-cancel" onClick={onClose}>
          Cancelar
        </button>
      </div>
    ) : null,
}));

const baseForm: EditFormState = {
  description: "Uber",
  amount: "85.5",
  category: "Transporte",
  date: "2026-03-15",
};

let ExpenseEditSheet: typeof import("./ExpenseEditSheet").ExpenseEditSheet;
beforeAll(async () => {
  ({ ExpenseEditSheet } = await import("./ExpenseEditSheet"));
});

describe("ExpenseEditSheet", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <ExpenseEditSheet
        open={false}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all four labeled fields when open=true", () => {
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
  });

  it("fields are pre-filled from editForm prop", () => {
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText(/descripción/i) as HTMLInputElement).value,
    ).toBe("Uber");
    expect((screen.getByLabelText(/monto/i) as HTMLInputElement).value).toBe(
      "85.5",
    );
    expect(
      (screen.getByLabelText(/categoría/i) as HTMLSelectElement).value,
    ).toBe("Transporte");
    expect((screen.getByLabelText(/fecha/i) as HTMLInputElement).value).toBe(
      "2026-03-15",
    );
  });

  it("onChange called with correct partial when description changes", () => {
    const onChange = vi.fn();
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Taxi" },
    });
    expect(onChange).toHaveBeenCalledWith({ description: "Taxi" });
  });

  it("onChange called with correct partial when amount changes", () => {
    const onChange = vi.fn();
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/monto/i), {
      target: { value: "200" },
    });
    expect(onChange).toHaveBeenCalledWith({ amount: "200" });
  });

  it("onChange called with correct partial when category changes", () => {
    const onChange = vi.fn();
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/categoría/i), {
      target: { value: "Salud" },
    });
    expect(onChange).toHaveBeenCalledWith({ category: "Salud" });
  });

  it("onChange called with correct partial when date changes", () => {
    const onChange = vi.fn();
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/fecha/i), {
      target: { value: "2026-04-01" },
    });
    expect(onChange).toHaveBeenCalledWith({ date: "2026-04-01" });
  });

  it("onSave called when save button clicked", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseEditSheet
        open={true}
        onClose={vi.fn()}
        editForm={baseForm}
        onChange={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByTestId("sheet-save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("onClose called when cancel button clicked", () => {
    const onClose = vi.fn();
    render(
      <ExpenseEditSheet
        open={true}
        onClose={onClose}
        editForm={baseForm}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("sheet-cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
