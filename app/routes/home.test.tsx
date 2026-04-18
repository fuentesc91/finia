import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "~/context/auth";

vi.mock("~/context/auth", () => ({ useAuth: vi.fn() }));
vi.mock("~/lib/firebase.client", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("~/components/expenses/ExpenseForm", () => ({
  ExpenseForm: ({ uid }: { uid: string }) => <div data-testid="expense-form" data-uid={uid} />,
}));
vi.mock("~/components/expenses/ExpenseList", () => ({
  ExpenseList: ({ uid }: { uid: string }) => <div data-testid="expense-list" data-uid={uid} />,
}));
vi.mock("~/components/budget/BudgetRibbon", () => ({
  BudgetRibbon: () => null,
}));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [k: string]: unknown }) => (
      <a href={to} {...rest}>{children}</a>
    ),
  };
});

const mockUseAuth = useAuth as Mock;
const FAKE_USER = { uid: "u1", displayName: "María García", email: "maria@example.com" };

let Home: typeof import("~/routes/home").default;
beforeAll(async () => {
  ({ default: Home } = await import("~/routes/home"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Home route", () => {
  it("redirects to '/login' when not authenticated", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<Home />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("shows spinner when loading=true", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<Home />);
    expect(screen.queryByTestId("expense-form")).toBeNull();
  });

  it("shows user displayName in greeting", () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    render(<Home />);
    expect(screen.getByText("María García")).toBeInTheDocument();
  });

  it("shows user email when displayName is null", () => {
    mockUseAuth.mockReturnValue({ user: { ...FAKE_USER, displayName: null }, loading: false });
    render(<Home />);
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });

  it("renders ExpenseForm and ExpenseList with the user uid", () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    render(<Home />);
    expect(screen.getByTestId("expense-form")).toHaveAttribute("data-uid", "u1");
    expect(screen.getByTestId("expense-list")).toHaveAttribute("data-uid", "u1");
  });

  it("settings icon link points to '/settings'", () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    render(<Home />);
    expect(screen.getByRole("link", { name: /configuración/i })).toHaveAttribute("href", "/settings");
  });
});
