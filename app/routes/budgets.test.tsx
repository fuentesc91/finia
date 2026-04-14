import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import Budgets from "~/routes/budgets";

vi.mock("~/lib/firebase.client", () => ({ db: {}, auth: {} }));
vi.mock("~/context/auth", () => ({ useAuth: vi.fn() }));
vi.mock("react-router", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));
vi.mock("~/components/budget/BudgetList", () => ({
  BudgetList: ({ uid }: { uid: string }) => <div data-testid="budget-list" data-uid={uid} />,
}));

import { useAuth } from "~/context/auth";
import { useNavigate } from "react-router";

const mockUseAuth = useAuth as Mock;
const mockUseNavigate = useNavigate as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNavigate.mockReturnValue(vi.fn());
});

describe("Budgets route", () => {
  it("shows a spinner while loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<Budgets />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<Budgets />);
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("renders BudgetList with the user uid when authenticated", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    render(<Budgets />);
    const list = screen.getByTestId("budget-list");
    expect(list).toBeInTheDocument();
    expect(list.getAttribute("data-uid")).toBe("uid1");
  });

  it("renders the back link to /", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    render(<Budgets />);
    const backLink = screen.getByLabelText("Volver");
    expect(backLink).toHaveAttribute("href", "/");
  });
});
