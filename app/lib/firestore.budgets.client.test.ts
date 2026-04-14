import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => "TIMESTAMP_SENTINEL"),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

import {
  saveBudget,
  updateBudget,
  deleteBudget,
  getBudgets,
  subscribeToBudgets,
} from "~/lib/firestore.budgets.client";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  doc,
  query,
} from "firebase/firestore";

const mockCollection = collection as Mock;
const mockAddDoc = addDoc as Mock;
const mockUpdateDoc = updateDoc as Mock;
const mockDeleteDoc = deleteDoc as Mock;
const mockGetDocs = getDocs as Mock;
const mockOnSnapshot = onSnapshot as Mock;
const mockDoc = doc as Mock;
const mockQuery = query as Mock;

const FAKE_COL = { path: "users/uid1/budgets" };
const FAKE_DOC_REF = { path: "users/uid1/budgets/b1" };
const FAKE_QUERY = { _q: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockCollection.mockReturnValue(FAKE_COL);
  mockDoc.mockReturnValue(FAKE_DOC_REF);
  mockQuery.mockReturnValue(FAKE_QUERY);
});

const BUDGET_INPUT = {
  period: { type: "monthly" as const },
  category: "Alimentación" as const,
  amount: 2000,
};

const FAKE_TIMESTAMP = { toDate: () => new Date("2026-04-01T00:00:00Z") };

function makeFakeDoc(overrides: Partial<ReturnType<() => Record<string, unknown>>> = {}) {
  return {
    id: "b1",
    data: () => ({
      period: { type: "monthly" },
      category: "Alimentación",
      amount: 2000,
      createdAt: FAKE_TIMESTAMP,
      updatedAt: FAKE_TIMESTAMP,
      ...overrides,
    }),
  };
}

// ─── saveBudget ───────────────────────────────────────────────────────────────

describe("saveBudget", () => {
  it("calls addDoc with correct payload and returns new doc id", async () => {
    mockAddDoc.mockResolvedValue({ id: "b1" });
    const id = await saveBudget("uid1", BUDGET_INPUT);
    expect(id).toBe("b1");
    const [colRef, data] = mockAddDoc.mock.calls[0];
    expect(colRef).toBe(FAKE_COL);
    expect(data).toMatchObject({
      period: { type: "monthly" },
      category: "Alimentación",
      amount: 2000,
      createdAt: "TIMESTAMP_SENTINEL",
      updatedAt: "TIMESTAMP_SENTINEL",
    });
  });

  it("throws a normalized Spanish error on permission-denied", async () => {
    mockAddDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(saveBudget("uid1", BUDGET_INPUT)).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });

  it("throws a normalized Spanish error on unavailable", async () => {
    mockAddDoc.mockRejectedValue({ code: "unavailable" });
    await expect(saveBudget("uid1", BUDGET_INPUT)).rejects.toThrow(
      "Servicio no disponible. Verifica tu conexión."
    );
  });
});

// ─── updateBudget ─────────────────────────────────────────────────────────────

describe("updateBudget", () => {
  it("calls updateDoc with the correct doc ref and payload including fresh timestamp", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await updateBudget("uid1", "b1", { amount: 3000 });
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
    const [ref, data] = mockUpdateDoc.mock.calls[0];
    expect(ref).toBe(FAKE_DOC_REF);
    expect(data).toMatchObject({ amount: 3000, updatedAt: "TIMESTAMP_SENTINEL" });
  });

  it("throws a normalized Spanish error on permission-denied", async () => {
    mockUpdateDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(updateBudget("uid1", "b1", { amount: 500 })).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });
});

// ─── deleteBudget ─────────────────────────────────────────────────────────────

describe("deleteBudget", () => {
  it("calls deleteDoc with the correct doc ref", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await deleteBudget("uid1", "b1");
    expect(mockDeleteDoc).toHaveBeenCalledOnce();
    expect(mockDeleteDoc.mock.calls[0][0]).toBe(FAKE_DOC_REF);
  });

  it("silently no-ops when document is not-found", async () => {
    mockDeleteDoc.mockRejectedValue({ code: "not-found" });
    await expect(deleteBudget("uid1", "b1")).resolves.toBeUndefined();
  });

  it("throws a normalized Spanish error for other errors", async () => {
    mockDeleteDoc.mockRejectedValue({ code: "permission-denied" });
    await expect(deleteBudget("uid1", "b1")).rejects.toThrow(
      "No tienes permiso para realizar esta acción."
    );
  });
});

// ─── getBudgets ───────────────────────────────────────────────────────────────

describe("getBudgets", () => {
  it("returns empty array when there are no documents", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await expect(getBudgets("uid1")).resolves.toEqual([]);
  });

  it("maps Firestore docs to Budget objects correctly", async () => {
    mockGetDocs.mockResolvedValue({ docs: [makeFakeDoc()] });
    const result = await getBudgets("uid1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "b1",
      period: { type: "monthly" },
      category: "Alimentación",
      amount: 2000,
    });
  });

  it("falls back to monthly period when period type is unrecognized", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [makeFakeDoc({ period: { type: "quarterly" } })],
    });
    const result = await getBudgets("uid1");
    expect(result[0].period).toEqual({ type: "monthly" });
  });

  it("sets category to null for unrecognized category values", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [makeFakeDoc({ category: "UnknownCategory" })],
    });
    const result = await getBudgets("uid1");
    expect(result[0].category).toBeNull();
  });

  it("correctly maps null category (global budget)", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [makeFakeDoc({ category: null })],
    });
    const result = await getBudgets("uid1");
    expect(result[0].category).toBeNull();
  });

  it("throws a normalized Spanish error on unavailable", async () => {
    mockGetDocs.mockRejectedValue({ code: "unavailable" });
    await expect(getBudgets("uid1")).rejects.toThrow(
      "Servicio no disponible. Verifica tu conexión."
    );
  });
});

// ─── subscribeToBudgets ───────────────────────────────────────────────────────

describe("subscribeToBudgets", () => {
  it("calls callback with mapped budgets from snapshot", () => {
    mockOnSnapshot.mockImplementation((_q, successCb) => {
      successCb({ docs: [makeFakeDoc()] });
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToBudgets("uid1", callback);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]).toMatchObject([
      { id: "b1", period: { type: "monthly" }, category: "Alimentación", amount: 2000 },
    ]);
  });

  it("calls onError with a normalized Spanish error on Firestore error", () => {
    mockOnSnapshot.mockImplementation((_q, _successCb, errorCb) => {
      errorCb({ code: "permission-denied" });
      return vi.fn();
    });

    const onError = vi.fn();
    subscribeToBudgets("uid1", vi.fn(), onError);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe("No tienes permiso para realizar esta acción.");
  });

  it("returns the unsubscribe function from onSnapshot", () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubscribe);
    const result = subscribeToBudgets("uid1", vi.fn());
    expect(result).toBe(unsubscribe);
  });
});
