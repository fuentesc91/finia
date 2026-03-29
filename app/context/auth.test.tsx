import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import { AuthProvider, useAuth } from "~/context/auth";

vi.mock("~/lib/firebase.client", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: vi.fn() }));

const mockOnAuthStateChanged = onAuthStateChanged as Mock;

function AuthConsumer() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? (user as { email: string }).email : "null"}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("starts with loading=true and user=null before the callback fires", () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("sets loading=false and user after callback fires with a user object", async () => {
    let capturedCallback: ((u: unknown) => void) | null = null;
    mockOnAuthStateChanged.mockImplementation((_: unknown, cb: (u: unknown) => void) => {
      capturedCallback = cb;
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback!({ uid: "u1", email: "test@example.com" });
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
  });

  it("sets loading=false and user=null after callback fires with null", async () => {
    let capturedCallback: ((u: unknown) => void) | null = null;
    mockOnAuthStateChanged.mockImplementation((_: unknown, cb: (u: unknown) => void) => {
      capturedCallback = cb;
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback!(null);
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("calls the unsubscribe function on unmount", () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChanged.mockImplementation(() => unsubscribe);
    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("useAuth", () => {
  it("returns default context values when used outside AuthProvider", () => {
    function Bare() {
      const ctx = useAuth();
      return <span data-testid="val">{String(ctx.loading)}</span>;
    }
    render(<Bare />);
    expect(screen.getByTestId("val").textContent).toBe("true");
  });
});
