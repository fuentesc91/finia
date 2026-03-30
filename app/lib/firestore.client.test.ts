import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => "DELETE_SENTINEL"),
  serverTimestamp: vi.fn(() => "TIMESTAMP_SENTINEL"),
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

import { saveAnthropicKey, getAnthropicSettings, deleteAnthropicKey, saveExpense, getExpenses, subscribeToExpenses } from "~/lib/firestore.client";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs, onSnapshot, query } from "firebase/firestore";

const mockDoc = doc as Mock;
const mockGetDoc = getDoc as Mock;
const mockSetDoc = setDoc as Mock;
const mockUpdateDoc = updateDoc as Mock;
const mockAddDoc = addDoc as Mock;
const mockCollection = collection as Mock;
const mockGetDocs = getDocs as Mock;
const mockOnSnapshot = onSnapshot as Mock;
const mockQuery = query as Mock;
const FAKE_REF = { path: "users/uid1/settings/main" };
const FAKE_COL = { path: "users/uid1/expenses" };
const FAKE_QUERY = { _q: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue(FAKE_REF);
  mockCollection.mockReturnValue(FAKE_COL);
  mockQuery.mockReturnValue(FAKE_QUERY);
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

describe("saveExpense", () => {
  const EXPENSE = { description: "Lunch", amount: 150, category: "Alimentación" as const, date: "2026-03-29" };

  it("calls addDoc with correct fields and returns the new doc id", async () => {
    mockAddDoc.mockResolvedValue({ id: "exp1" });
    const id = await saveExpense("uid1", EXPENSE);
    expect(id).toBe("exp1");
    expect(mockAddDoc).toHaveBeenCalledOnce();
    const [colRef, data] = mockAddDoc.mock.calls[0];
    expect(colRef).toBe(FAKE_COL);
    expect(data).toMatchObject({ description: "Lunch", amount: 150, category: "Alimentación", date: "2026-03-29" });
  });

  it("throws a normalized Spanish error on permission-denied", async () => {
    mockAddDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(saveExpense("uid1", EXPENSE)).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });
});

describe("getExpenses", () => {
  it("returns an empty array when there are no documents", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await expect(getExpenses("uid1")).resolves.toEqual([]);
  });

  it("maps Firestore docs to Expense objects correctly", async () => {
    const fakeTimestamp = { toDate: () => new Date("2026-03-29T10:00:00Z") };
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "exp1",
          data: () => ({
            description: "Uber",
            amount: 85.5,
            category: "Transporte",
            date: "2026-03-29",
            createdAt: fakeTimestamp,
          }),
        },
      ],
    });
    const result = await getExpenses("uid1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "exp1",
      description: "Uber",
      amount: 85.5,
      category: "Transporte",
      date: "2026-03-29",
    });
  });

  it("falls back to 'Otros' when category is not in the defined list", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "exp2",
          data: () => ({
            description: "Mystery",
            amount: 10,
            category: "UnknownCategory",
            date: "2026-03-01",
            createdAt: null,
          }),
        },
      ],
    });
    const result = await getExpenses("uid1");
    expect(result[0].category).toBe("Otros");
  });

  it("throws a normalized Spanish error on unavailable", async () => {
    mockGetDocs.mockRejectedValue({ code: "unavailable" });
    await expect(getExpenses("uid1")).rejects.toThrow(
      "Servicio no disponible. Verifica tu conexión."
    );
  });
});

describe("subscribeToExpenses", () => {
  const fakeTimestamp = { toDate: () => new Date("2026-03-15T00:00:00Z") };

  it("calls callback with mapped expenses from snapshot", () => {
    const fakeDocs = [
      {
        id: "e1",
        data: () => ({
          description: "Taxi", amount: 50, category: "Transporte",
          date: "2026-03-15", createdAt: fakeTimestamp,
        }),
      },
    ];
    mockOnSnapshot.mockImplementation((_q, successCb) => {
      successCb({ docs: fakeDocs });
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToExpenses("uid1", callback);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]).toMatchObject([
      { id: "e1", description: "Taxi", amount: 50, category: "Transporte", date: "2026-03-15" },
    ]);
  });

  it("falls back to 'Otros' for unrecognized categories in snapshot", () => {
    mockOnSnapshot.mockImplementation((_q, successCb) => {
      successCb({
        docs: [
          { id: "e2", data: () => ({ description: "X", amount: 10, category: "Desconocida", date: "2026-03-01", createdAt: null }) },
        ],
      });
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToExpenses("uid1", callback);
    expect(callback.mock.calls[0][0][0].category).toBe("Otros");
  });

  it("calls onError with a normalized Spanish error on Firestore error", () => {
    mockOnSnapshot.mockImplementation((_q, _successCb, errorCb) => {
      errorCb({ code: "permission-denied" });
      return vi.fn();
    });

    const onError = vi.fn();
    subscribeToExpenses("uid1", vi.fn(), onError);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe("No tienes permiso para realizar esta acción.");
  });

  it("returns the unsubscribe function from onSnapshot", () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubscribe);
    const result = subscribeToExpenses("uid1", vi.fn());
    expect(result).toBe(unsubscribe);
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
