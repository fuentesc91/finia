import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => "DELETE_SENTINEL"),
  serverTimestamp: vi.fn(() => "TIMESTAMP_SENTINEL"),
}));

import { saveAnthropicKey, getAnthropicSettings, deleteAnthropicKey } from "~/lib/firestore.client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const mockDoc = doc as Mock;
const mockGetDoc = getDoc as Mock;
const mockSetDoc = setDoc as Mock;
const mockUpdateDoc = updateDoc as Mock;
const FAKE_REF = { path: "users/uid1/settings/main" };

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue(FAKE_REF);
});

describe("saveAnthropicKey", () => {
  it("calls setDoc with merge:true and correct payload", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await saveAnthropicKey("uid1", "sk-ant-key", true);
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [ref, data, options] = mockSetDoc.mock.calls[0];
    expect(ref).toBe(FAKE_REF);
    expect(data).toMatchObject({ anthropicApiKey: "sk-ant-key", hasCredits: true });
    expect(options).toEqual({ merge: true });
  });

  it("throws a normalized Spanish error on permission-denied", async () => {
    mockSetDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(saveAnthropicKey("uid1", "sk-ant-key", true)).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });
});

describe("getAnthropicSettings", () => {
  it("returns null when the document does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await expect(getAnthropicSettings("uid1")).resolves.toBeNull();
  });

  it("returns apiKey and hasCredits from existing doc", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ anthropicApiKey: "sk-ant-abc", hasCredits: true }),
    });
    await expect(getAnthropicSettings("uid1")).resolves.toEqual({
      apiKey: "sk-ant-abc",
      hasCredits: true,
    });
  });

  it("defaults hasCredits to true when field is absent", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ anthropicApiKey: "sk-ant-abc" }),
    });
    const result = await getAnthropicSettings("uid1");
    expect(result?.hasCredits).toBe(true);
  });

  it("returns null when anthropicApiKey field is missing", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ someOtherField: 123 }),
    });
    await expect(getAnthropicSettings("uid1")).resolves.toBeNull();
  });

  it("throws a normalized Spanish error on unavailable", async () => {
    mockGetDoc.mockRejectedValue({ code: "unavailable" });
    await expect(getAnthropicSettings("uid1")).rejects.toThrow(
      "Servicio no disponible. Verifica tu conexión."
    );
  });
});

describe("deleteAnthropicKey", () => {
  it("calls updateDoc with deleteField() for the anthropicApiKey field", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await deleteAnthropicKey("uid1");
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
    const [ref, fields] = mockUpdateDoc.mock.calls[0];
    expect(ref).toBe(FAKE_REF);
    expect(fields).toMatchObject({ anthropicApiKey: "DELETE_SENTINEL" });
  });

  it("silently no-ops when the document is not-found", async () => {
    mockUpdateDoc.mockRejectedValue({ code: "not-found" });
    await expect(deleteAnthropicKey("uid1")).resolves.toBeUndefined();
  });

  it("throws a normalized Spanish error for other firestore errors", async () => {
    mockUpdateDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(deleteAnthropicKey("uid1")).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });
});

describe("normalizeFirestoreError (via public API)", () => {
  it("maps unavailable to Spanish message", async () => {
    mockGetDoc.mockRejectedValue({ code: "unavailable" });
    await expect(getAnthropicSettings("uid1")).rejects.toThrow(
      "Servicio no disponible. Verifica tu conexión."
    );
  });

  it("uses generic fallback for unknown error codes", async () => {
    mockGetDoc.mockRejectedValue({ code: "quota-exceeded" });
    await expect(getAnthropicSettings("uid1")).rejects.toThrow(
      "Error al acceder a los datos. Intenta de nuevo."
    );
  });

  it("uses unknown-error fallback when err has no code property", async () => {
    mockGetDoc.mockRejectedValue(new Error("network failure"));
    await expect(getAnthropicSettings("uid1")).rejects.toThrow(
      "Error desconocido. Intenta de nuevo."
    );
  });
});
