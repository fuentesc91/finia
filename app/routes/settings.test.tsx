import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "~/context/auth";
import { getAnthropicSettings, saveAnthropicKey, deleteAnthropicKey } from "~/lib/firestore.client";
import { validateAnthropicKey } from "~/lib/anthropic";

vi.mock("~/context/auth", () => ({ useAuth: vi.fn() }));
vi.mock("~/lib/firebase.client", () => ({ auth: {}, db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  getAnthropicSettings: vi.fn(),
  saveAnthropicKey: vi.fn(),
  deleteAnthropicKey: vi.fn(),
}));
vi.mock("~/lib/anthropic", () => ({
  validateAnthropicKey: vi.fn(),
  maskAnthropicKey: vi.fn((key: string) => key.slice(0, 10) + "••••••••"),
}));

const mockNavigate = vi.fn();

// Mutable fetcher object — tests mutate this to simulate server action responses
const fetcherState: {
  submit: Mock;
  state: "idle" | "submitting" | "loading";
  data: Record<string, unknown> | undefined;
} = {
  submit: vi.fn(),
  state: "idle",
  data: undefined,
};

vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useFetcher: () => fetcherState,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

const mockUseAuth = useAuth as Mock;
const mockGetAnthropicSettings = getAnthropicSettings as Mock;
const mockSaveAnthropicKey = saveAnthropicKey as Mock;
const mockDeleteAnthropicKey = deleteAnthropicKey as Mock;
const mockValidateAnthropicKey = validateAnthropicKey as Mock;

const FAKE_USER = { uid: "u1", email: "a@b.com", displayName: null };

let Settings: typeof import("~/routes/settings").default;
beforeAll(async () => {
  ({ default: Settings } = await import("~/routes/settings"));
});

beforeEach(() => {
  vi.clearAllMocks();
  fetcherState.state = "idle";
  fetcherState.data = undefined;
  fetcherState.submit = vi.fn();
  mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
  mockValidateAnthropicKey.mockReturnValue({ valid: true });
  mockGetAnthropicSettings.mockResolvedValue(null);
  mockSaveAnthropicKey.mockResolvedValue(undefined);
  mockDeleteAnthropicKey.mockResolvedValue(undefined);
});

describe("Settings route", () => {
  it("redirects to '/login' when not authenticated", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<Settings />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("shows 'No conectado' badge when settings returns null", async () => {
    mockGetAnthropicSettings.mockResolvedValue(null);
    render(<Settings />);
    await screen.findByText("No conectado");
  });

  it("shows '✓ Conectado' badge when key exists and hasCredits=true", async () => {
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-" + "x".repeat(40), hasCredits: true });
    render(<Settings />);
    await screen.findByText("✓ Conectado");
  });

  it("shows 'Sin créditos' badge when key exists and hasCredits=false", async () => {
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-" + "x".repeat(40), hasCredits: false });
    render(<Settings />);
    await screen.findByText("Sin créditos");
  });

  it("shows masked current key when a key exists", async () => {
    const key = "sk-ant-api0" + "x".repeat(40);
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: key, hasCredits: true });
    render(<Settings />);
    await screen.findByText(key.slice(0, 10) + "••••••••");
  });

  it("shows error when validation fails (wrong prefix)", async () => {
    mockValidateAnthropicKey.mockReturnValue({ valid: false, error: "La clave debe comenzar con sk-ant-" });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText("No conectado");
    await user.type(screen.getByRole("textbox"), "invalid-key");
    await user.click(screen.getByRole("button", { name: /verificar y guardar/i }));
    await screen.findByText("La clave debe comenzar con sk-ant-");
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("shows error when validation fails (too short)", async () => {
    mockValidateAnthropicKey.mockReturnValue({ valid: false, error: "La clave parece demasiado corta. Verifica que la copiaste completa." });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText("No conectado");
    await user.type(screen.getByRole("textbox"), "sk-ant-short");
    await user.click(screen.getByRole("button", { name: /verificar y guardar/i }));
    await screen.findByText(/demasiado corta/);
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("disables submit button when textarea is empty", async () => {
    render(<Settings />);
    await screen.findByText("No conectado");
    expect(screen.getByRole("button", { name: /verificar y guardar/i })).toBeDisabled();
  });

  it("first delete click shows '¿Confirmar?'", async () => {
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-" + "x".repeat(40), hasCredits: true });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText("✓ Conectado");
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("button", { name: "¿Confirmar?" })).toBeInTheDocument();
    expect(mockDeleteAnthropicKey).not.toHaveBeenCalled();
  });

  it("second delete click calls deleteAnthropicKey", async () => {
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-" + "x".repeat(40), hasCredits: true });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText("✓ Conectado");
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "¿Confirmar?" }));
    await waitFor(() => expect(mockDeleteAnthropicKey).toHaveBeenCalledWith("u1"));
  });

  it("shows 'Claude desconectado.' after successful delete", async () => {
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-" + "x".repeat(40), hasCredits: true });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText("✓ Conectado");
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "¿Confirmar?" }));
    await screen.findByText("Claude desconectado.");
  });

  it("calls saveAnthropicKey and shows green success when fetcher returns valid=true + hasCredits=true", async () => {
    const { rerender } = render(<Settings />);
    await screen.findByText("No conectado");

    fetcherState.data = { valid: true, hasCredits: true };
    await act(async () => { rerender(<Settings />); });

    await waitFor(() =>
      expect(mockSaveAnthropicKey).toHaveBeenCalledWith("u1", expect.any(String), true)
    );
    await screen.findByText(/clave verificada y guardada/i);
  });

  it("calls saveAnthropicKey and shows amber warning when fetcher returns valid=true + hasCredits=false", async () => {
    const { rerender } = render(<Settings />);
    await screen.findByText("No conectado");

    fetcherState.data = { valid: true, hasCredits: false };
    await act(async () => { rerender(<Settings />); });

    await waitFor(() =>
      expect(mockSaveAnthropicKey).toHaveBeenCalledWith("u1", expect.any(String), false)
    );
    await screen.findByText(/no tiene créditos/i);
  });

  it("shows error and does NOT call saveAnthropicKey when fetcher returns valid=false", async () => {
    const { rerender } = render(<Settings />);
    await screen.findByText("No conectado");

    fetcherState.data = { valid: false, hasCredits: false, error: "Clave inválida. Verifica que la copiaste correctamente." };
    await act(async () => { rerender(<Settings />); });

    await screen.findByText("Clave inválida. Verifica que la copiaste correctamente.");
    expect(mockSaveAnthropicKey).not.toHaveBeenCalled();
  });
});
