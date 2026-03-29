import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useAuth } from "~/context/auth";

vi.mock("~/context/auth", () => ({ useAuth: vi.fn() }));
vi.mock("~/lib/firebase.client", () => ({ auth: {}, googleProvider: {} }));
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

const mockUseAuth = useAuth as Mock;
const mockSignIn = signInWithEmailAndPassword as Mock;
const mockCreateUser = createUserWithEmailAndPassword as Mock;
const mockSignInWithPopup = signInWithPopup as Mock;

// The login/register form has two "Iniciar sesión" buttons: the mode toggle and the submit.
// This helper selects the submit button specifically.
function getSubmitButton() {
  return screen.getAllByRole("button", { name: /iniciar sesión/i }).find(
    (b) => b.getAttribute("type") === "submit"
  )!;
}

let Login: typeof import("~/routes/login").default;
beforeAll(async () => {
  ({ default: Login } = await import("~/routes/login"));
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null, loading: false });
});

describe("Login route", () => {
  it("redirects to '/' when user is already logged in", async () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    render(<Login />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  it("renders a spinner when loading=true (no form visible)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<Login />);
    expect(screen.queryByLabelText(/correo/i)).toBeNull();
  });

  it("renders in 'Iniciar sesión' mode by default", () => {
    render(<Login />);
    // Both the toggle and the submit button say "Iniciar sesión" in login mode
    const buttons = screen.getAllByRole("button", { name: /iniciar sesión/i });
    expect(buttons.some((b) => b.getAttribute("type") === "submit")).toBe(true);
  });

  it("switches to 'Registrarse' mode when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<Login />);
    await user.click(screen.getByRole("button", { name: "Registrarse" }));
    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it("shows Spanish message for auth/invalid-credential", async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: "auth/invalid-credential" });
    render(<Login />);
    await user.type(screen.getByLabelText(/correo/i), "a@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "password");
    await user.click(getSubmitButton());
    await screen.findByText("Correo o contraseña incorrectos.");
  });

  it("shows Spanish message for auth/email-already-in-use", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockRejectedValue({ code: "auth/email-already-in-use" });
    render(<Login />);
    await user.click(screen.getByRole("button", { name: "Registrarse" }));
    await user.type(screen.getByLabelText(/correo/i), "a@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "password1");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await screen.findByText("Ya existe una cuenta con ese correo.");
  });

  it("shows fallback message for unknown error codes", async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: "auth/unknown-xyz" });
    render(<Login />);
    await user.type(screen.getByLabelText(/correo/i), "a@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "password");
    await user.click(getSubmitButton());
    await screen.findByText("Ocurrió un error. Intenta de nuevo.");
  });

  it("calls signInWithEmailAndPassword in login mode", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({});
    render(<Login />);
    await user.type(screen.getByLabelText(/correo/i), "test@test.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(getSubmitButton());
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({}, "test@test.com", "secret123")
    );
  });

  it("calls createUserWithEmailAndPassword in register mode", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockResolvedValue({});
    render(<Login />);
    await user.click(screen.getByRole("button", { name: "Registrarse" }));
    await user.type(screen.getByLabelText(/correo/i), "test@test.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() =>
      expect(mockCreateUser).toHaveBeenCalledWith({}, "test@test.com", "secret123")
    );
  });

  it("calls signInWithPopup when Google button is clicked", async () => {
    const user = userEvent.setup();
    mockSignInWithPopup.mockResolvedValue({});
    render(<Login />);
    await user.click(screen.getByRole("button", { name: /continuar con google/i }));
    await waitFor(() => expect(mockSignInWithPopup).toHaveBeenCalledOnce());
  });

  it("clears the error message when switching mode", async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: "auth/invalid-credential" });
    render(<Login />);
    await user.type(screen.getByLabelText(/correo/i), "a@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "pass");
    await user.click(getSubmitButton());
    await screen.findByText("Correo o contraseña incorrectos.");
    await user.click(screen.getByRole("button", { name: "Registrarse" }));
    expect(screen.queryByText("Correo o contraseña incorrectos.")).toBeNull();
  });
});
