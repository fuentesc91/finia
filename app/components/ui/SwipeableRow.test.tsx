import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwipeableRow } from "~/components/ui/SwipeableRow";

beforeEach(() => vi.clearAllMocks());

function getContentDiv() {
  return screen.getAllByRole("button").find((el) => el.tagName !== "BUTTON")!;
}

describe("SwipeableRow", () => {
  it("renders children", () => {
    render(
      <SwipeableRow actions={[{ label: "Del", onAction: vi.fn() }]}>
        <span>Gasto 1</span>
      </SwipeableRow>,
    );
    expect(screen.getByText("Gasto 1")).toBeInTheDocument();
  });

  it("renders action button with its label", () => {
    render(
      <SwipeableRow actions={[{ label: "Eliminar", onAction: vi.fn() }]}>
        <span>content</span>
      </SwipeableRow>,
    );
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("renders children directly when actions is empty", () => {
    const { container } = render(
      <SwipeableRow actions={[]}>
        <span>bare</span>
      </SwipeableRow>,
    );
    expect(screen.getByText("bare")).toBeInTheDocument();
    // No role=button wrapper
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("fires onTap when content is clicked (tap)", () => {
    const onTap = vi.fn();
    render(
      <SwipeableRow actions={[{ label: "Del", onAction: vi.fn() }]} onTap={onTap}>
        <span>content</span>
      </SwipeableRow>,
    );
    fireEvent.click(getContentDiv());
    expect(onTap).toHaveBeenCalledOnce();
  });

  // Swipe gesture detection (clientX coordinate tracking) requires a real browser
  // environment and is not testable in jsdom. Covered by manual/e2e testing.

  it("does not fire onTap when disabled", () => {
    const onTap = vi.fn();
    render(
      <SwipeableRow
        actions={[{ label: "Del", onAction: vi.fn() }]}
        onTap={onTap}
        disabled
      >
        <span>content</span>
      </SwipeableRow>,
    );
    fireEvent.click(getContentDiv());
    expect(onTap).not.toHaveBeenCalled();
  });

  it("fires Enter key as tap", () => {
    const onTap = vi.fn();
    render(
      <SwipeableRow actions={[{ label: "Del", onAction: vi.fn() }]} onTap={onTap}>
        <span>content</span>
      </SwipeableRow>,
    );
    fireEvent.keyDown(getContentDiv(), { key: "Enter" });
    expect(onTap).toHaveBeenCalledOnce();
  });

  it("calls onAction when action button is clicked", () => {
    const onAction = vi.fn();
    render(
      <SwipeableRow actions={[{ label: "Eliminar", onAction }]}>
        <span>content</span>
      </SwipeableRow>,
    );
    fireEvent.click(screen.getByText("Eliminar"));
    expect(onAction).toHaveBeenCalledOnce();
  });

  describe("two-tap confirmation", () => {
    it("shows confirmedLabel on first click", () => {
      render(
        <SwipeableRow
          actions={[{ label: "Eliminar", confirmedLabel: "¿Confirmar?", onAction: vi.fn() }]}
        >
          <span>content</span>
        </SwipeableRow>,
      );
      expect(screen.queryByText("¿Confirmar?")).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("Eliminar"));
      expect(screen.getByText("¿Confirmar?")).toBeInTheDocument();
    });

    it("calls onAction on second click and resets", () => {
      const onAction = vi.fn();
      render(
        <SwipeableRow
          actions={[{ label: "Eliminar", confirmedLabel: "¿Confirmar?", onAction }]}
        >
          <span>content</span>
        </SwipeableRow>,
      );
      fireEvent.click(screen.getByText("Eliminar"));
      fireEvent.click(screen.getByText("¿Confirmar?"));
      expect(onAction).toHaveBeenCalledOnce();
      expect(screen.getByText("Eliminar")).toBeInTheDocument();
    });
  });
});
