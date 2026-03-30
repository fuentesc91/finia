import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAnthropicSettings, saveExpense } from "~/lib/firestore.client";

vi.mock("~/lib/firebase.client", () => ({ auth: {}, db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  getAnthropicSettings: vi.fn(),
  saveExpense: vi.fn(),
}));

const fetcherState: {
  submit: Mock;
  state: "idle" | "submitting" | "loading";
  data: Record<string, unknown> | undefined;
} = { submit: vi.fn(), state: "idle", data: undefined };

vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useFetcher: () => fetcherState,
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [k: string]: unknown }) => (
      <a href={to} {...rest}>{children}</a>
    ),
  };
});

const mockGetAnthropicSettings = getAnthropicSettings as Mock;
const mockSaveExpense = saveExpense as Mock;
const CONNECTED = { apiKey: "sk-ant-x", hasCredits: true };

let ExpenseForm: typeof import("~/components/ExpenseForm").ExpenseForm;
beforeAll(async () => {
  ({ ExpenseForm } = await import("~/components/ExpenseForm"));
});

beforeEach(() => {
  vi.clearAllMocks();
  fetcherState.state = "idle";
  fetcherState.data = undefined;
  fetcherState.submit = vi.fn();
  mockSaveExpense.mockResolvedValue("new-id");
});

async function waitForEnabled() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /registrar gasto/i })).not.toBeDisabled()
  );
}

describe("ExpenseForm — Claude connection", () => {
  it("shows nudge banner when Claude is not connected", async () => {
    mockGetAnthropicSettings.mockResolvedValue(null);
    render(<ExpenseForm uid="u1" />);
    await screen.findByText(/conecta claude/i);
  });

  it("hides nudge banner when Claude is connected", async () => {
    mockGetAnthropicSettings.mockResolvedValue(CONNECTED);
    render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    expect(screen.queryByText(/conecta claude/i)).toBeNull();
  });

  it("disables submit button when Claude is not connected", async () => {
    mockGetAnthropicSettings.mockResolvedValue(null);
    render(<ExpenseForm uid="u1" />);
    await screen.findByText(/conecta claude/i);
    expect(screen.getByRole("button", { name: /registrar gasto/i })).toBeDisabled();
  });
});

describe("ExpenseForm — validation", () => {
  beforeEach(() => {
    mockGetAnthropicSettings.mockResolvedValue(CONNECTED);
  });

  it("shows error when description is empty", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    await user.type(screen.getByLabelText(/monto/i), "100");
    await user.click(screen.getByRole("button", { name: /registrar gasto/i }));
    expect(await screen.findByText(/describe el gasto/i)).toBeInTheDocument();
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("shows error when amount is zero", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    await user.type(screen.getByLabelText(/descripción/i), "Almuerzo");
    await user.type(screen.getByLabelText(/monto/i), "0");
    await user.click(screen.getByRole("button", { name: /registrar gasto/i }));
    expect(await screen.findByText(/monto/i)).toBeInTheDocument();
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });
});

describe("ExpenseForm — submission", () => {
  beforeEach(() => {
    mockGetAnthropicSettings.mockResolvedValue(CONNECTED);
  });

  it("submits description, amount, and apiKey to /expenses", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    await user.type(screen.getByLabelText(/descripción/i), "Uber");
    await user.type(screen.getByLabelText(/monto/i), "85.50");
    await user.click(screen.getByRole("button", { name: /registrar gasto/i }));
    expect(fetcherState.submit).toHaveBeenCalledOnce();
    const [formData, opts] = fetcherState.submit.mock.calls[0];
    expect(formData.get("description")).toBe("Uber");
    expect(formData.get("amount")).toBe("85.5");
    expect(formData.get("apiKey")).toBe("sk-ant-x");
    expect(opts).toMatchObject({ method: "POST", action: "/expenses" });
  });

  it("calls saveExpense on success and clears the form", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    await user.type(screen.getByLabelText(/descripción/i), "Almuerzo");
    await user.type(screen.getByLabelText(/monto/i), "150");
    await user.click(screen.getByRole("button", { name: /registrar gasto/i }));

    await act(async () => {
      fetcherState.state = "idle";
      fetcherState.data = { category: "Alimentación" };
      rerender(<ExpenseForm uid="u1" />);
    });

    await waitFor(() => expect(mockSaveExpense).toHaveBeenCalledOnce());
    const [uid, arg] = mockSaveExpense.mock.calls[0];
    expect(uid).toBe("u1");
    expect(arg).toMatchObject({ description: "Almuerzo", amount: 150, category: "Alimentación" });

    // Form fields should be cleared
    await waitFor(() => {
      expect(screen.getByLabelText(/descripción/i)).toHaveValue("");
    });
  });

  it("shows error from action and does not call saveExpense", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExpenseForm uid="u1" />);
    await waitForEnabled();
    await user.type(screen.getByLabelText(/descripción/i), "Algo");
    await user.type(screen.getByLabelText(/monto/i), "50");
    await user.click(screen.getByRole("button", { name: /registrar gasto/i }));

    await act(async () => {
      fetcherState.state = "idle";
      fetcherState.data = { error: "Límite de uso alcanzado. Intenta en unos minutos." };
      rerender(<ExpenseForm uid="u1" />);
    });

    expect(await screen.findByText(/límite de uso/i)).toBeInTheDocument();
    expect(mockSaveExpense).not.toHaveBeenCalled();
  });
});
