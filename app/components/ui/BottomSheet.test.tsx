import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "~/components/ui/BottomSheet";

beforeEach(() => vi.clearAllMocks());

describe("BottomSheet", () => {
  it("renders nothing when open=false", () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <span>content</span>
      </BottomSheet>,
    );
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children when open=true", () => {
    render(
      <BottomSheet open onClose={vi.fn()}>
        <span>content</span>
      </BottomSheet>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders the title when provided", () => {
    render(
      <BottomSheet open onClose={vi.fn()} title="Editar gasto">
        <span>content</span>
      </BottomSheet>,
    );
    expect(screen.getByText("Editar gasto")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose}>
        <span>content</span>
      </BottomSheet>,
    );
    // The backdrop is the first child of the fixed container
    const backdrop = document.querySelector(".bg-black\\/40")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose}>
        <span>content</span>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose}>
        <span>content</span>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when panel content is clicked", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose}>
        <span>content</span>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
