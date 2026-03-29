import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "~/context/auth";
import { getAnthropicSettings } from "~/lib/firestore.client";

vi.mock("~/context/auth", () => ({ useAuth: vi.fn() }));
vi.mock("~/lib/firebase.client", () => ({ auth: {} }));
vi.mock("~/lib/firestore.client", () => ({ getAnthropicSettings: vi.fn() }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));

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
const mockGetAnthropicSettings = getAnthropicSettings as Mock;
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

  it("shows spinner when loading=true (no greeting visible)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<Home />);
    expect(screen.queryByText(/hola/i)).toBeNull();
  });

  it("shows user displayName when available", () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-x", hasCredits: true });
    render(<Home />);
    expect(screen.getByText("María García")).toBeInTheDocument();
  });

  it("shows user email when displayName is null", () => {
    mockUseAuth.mockReturnValue({ user: { ...FAKE_USER, displayName: null }, loading: false });
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-x", hasCredits: true });
    render(<Home />);
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });

  it("shows nudge banner when getAnthropicSettings returns null", async () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    mockGetAnthropicSettings.mockResolvedValue(null);
    render(<Home />);
    await screen.findByText(/conecta claude/i);
  });

  it("hides nudge banner when settings has hasCredits=true", async () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    mockGetAnthropicSettings.mockResolvedValue({ apiKey: "sk-ant-x", hasCredits: true });
    render(<Home />);
    await waitFor(() => expect(screen.queryByText(/conecta claude/i)).toBeNull());
  });

  it("settings icon link points to '/settings'", () => {
    mockUseAuth.mockReturnValue({ user: FAKE_USER, loading: false });
    mockGetAnthropicSettings.mockResolvedValue(null);
    render(<Home />);
    const link = screen.getByRole("link", { name: /configuración/i });
    expect(link).toHaveAttribute("href", "/settings");
  });
});
