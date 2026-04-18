import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("~/components/ui/BottomSheet", () => ({
  BottomSheet: ({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
  }) =>
    open ? (
      <div>
        {title && <h2>{title}</h2>}
        <button onClick={onClose} aria-label="Cerrar">✕</button>
        {children}
      </div>
    ) : null,
}));

import { DataEditSheet } from "~/components/ui/DataEditSheet";

beforeEach(() => vi.clearAllMocks());

describe("DataEditSheet", () => {
  it("renders nothing when open=false", () => {
    render(
      <DataEditSheet open={false} onClose={vi.fn()} onSave={vi.fn()}>
        <span>form content</span>
      </DataEditSheet>,
    );
    expect(screen.queryByText("form content")).not.toBeInTheDocument();
  });

  it("renders children and title when open=true", () => {
    render(
      <DataEditSheet open onClose={vi.fn()} onSave={vi.fn()} title="Editar gasto">
        <span>form content</span>
      </DataEditSheet>,
    );
    expect(screen.getByText("form content")).toBeInTheDocument();
    expect(screen.getByText("Editar gasto")).toBeInTheDocument();
  });

  it("calls onSave and then onClose on successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <DataEditSheet open onClose={onClose} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar"));
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows error when onSave rejects, without calling onClose", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Conexión fallida"));
    const onClose = vi.fn();
    render(
      <DataEditSheet open onClose={onClose} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar"));
    });
    expect(screen.getByText("Conexión fallida")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <DataEditSheet open onClose={onClose} onSave={vi.fn()}>
        <span>form</span>
      </DataEditSheet>,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("disables both buttons while saving", async () => {
    let resolve!: () => void;
    const onSave = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(
      <DataEditSheet open onClose={vi.fn()} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );

    fireEvent.click(screen.getByText("Guardar"));

    expect(screen.getByText("Guardando...")).toBeDisabled();
    expect(screen.getByText("Cancelar")).toBeDisabled();

    await act(async () => { resolve(); });
  });

  it("clears error when open changes to false then true", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fallo"));
    const { rerender } = render(
      <DataEditSheet open onClose={vi.fn()} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Guardar"));
    });

    expect(screen.getByText("fallo")).toBeInTheDocument();

    rerender(
      <DataEditSheet open={false} onClose={vi.fn()} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );
    rerender(
      <DataEditSheet open onClose={vi.fn()} onSave={onSave}>
        <span>form</span>
      </DataEditSheet>,
    );

    expect(screen.queryByText("fallo")).not.toBeInTheDocument();
  });
});
