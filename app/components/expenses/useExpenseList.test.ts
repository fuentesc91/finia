import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  type Mock,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  subscribeToExpenses,
  getExpensesPage,
  deleteExpense,
  updateExpense,
} from "~/lib/firestore.client";
import type { Expense } from "~/types/expense";
import { EXPENSES_PAGE_SIZE } from "~/config";

vi.mock("~/lib/firebase.client", () => ({ db: {} }));
vi.mock("~/lib/firestore.client", () => ({
  subscribeToExpenses: vi.fn(),
  getExpensesPage: vi.fn(),
  deleteExpense: vi.fn(),
  updateExpense: vi.fn(),
}));

const mockSubscribe = subscribeToExpenses as Mock;
const mockGetPage = getExpensesPage as Mock;
const mockDelete = deleteExpense as Mock;
const mockUpdate = updateExpense as Mock;

function fakeSubscribe(expenses: Expense[]) {
  mockSubscribe.mockImplementation(
    (_uid: string, callback: (e: Expense[]) => void) => {
      callback(expenses);
      return vi.fn();
    },
  );
}

function makeExpense(
  id: string,
  date = "2026-03-15",
  createdAt = new Date("2026-03-15T10:00:00Z"),
): Expense {
  return {
    id,
    description: `Gasto ${id}`,
    amount: 100,
    category: "Transporte",
    date,
    createdAt,
  };
}

const UBER: Expense = {
  ...makeExpense("e1"),
  description: "Uber",
  category: "Transporte",
  amount: 85.5,
};
const SUPER: Expense = {
  ...makeExpense("e2", "2026-02-10", new Date("2026-02-10T10:00:00Z")),
  description: "Supermercado",
  category: "Alimentación",
  amount: 320,
};

let useExpenseList: typeof import("~/components/expenses/useExpenseList").useExpenseList;
beforeAll(async () => {
  ({ useExpenseList } = await import("~/components/expenses/useExpenseList"));
});

beforeEach(() => vi.clearAllMocks());

describe("useExpenseList", () => {
  describe("subscription lifecycle", () => {
    it("calls subscribeToExpenses with uid and page size on mount", () => {
      fakeSubscribe([]);
      renderHook(() => useExpenseList("u1"));
      expect(mockSubscribe).toHaveBeenCalledWith(
        "u1",
        expect.any(Function),
        expect.any(Function),
        EXPENSES_PAGE_SIZE,
      );
    });

    it("calls unsubscribe on unmount", () => {
      const unsubscribe = vi.fn();
      mockSubscribe.mockImplementation(
        (_uid: string, callback: (e: Expense[]) => void) => {
          callback([]);
          return unsubscribe;
        },
      );
      const { unmount } = renderHook(() => useExpenseList("u1"));
      unmount();
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("re-subscribes and resets state when uid changes", () => {
      fakeSubscribe([UBER]);
      const { rerender, result } = renderHook(
        ({ uid }) => useExpenseList(uid),
        {
          initialProps: { uid: "u1" },
        },
      );
      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      fakeSubscribe([SUPER]);
      rerender({ uid: "u2" });

      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(mockSubscribe.mock.calls[1][0]).toBe("u2");
      expect(result.current.editingExpense).toBeNull();
      expect(result.current.deletingId).toBeNull();
      expect(result.current.deleteError).toBeNull();
    });

    it("sets loading=false after first snapshot", () => {
      fakeSubscribe([]);
      const { result } = renderHook(() => useExpenseList("u1"));
      expect(result.current.loading).toBe(false);
    });

    it("sets hasMore=true when subscription returns exactly EXPENSES_PAGE_SIZE expenses", () => {
      const expenses = Array.from({ length: EXPENSES_PAGE_SIZE }, (_, i) =>
        makeExpense(`e${i}`),
      );
      fakeSubscribe(expenses);
      const { result } = renderHook(() => useExpenseList("u1"));
      expect(result.current.hasMore).toBe(true);
    });

    it("sets hasMore=false when subscription returns fewer than EXPENSES_PAGE_SIZE expenses", () => {
      fakeSubscribe([UBER, SUPER]);
      const { result } = renderHook(() => useExpenseList("u1"));
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("loadMore", () => {
    it("uses last expense createdAt as cursor", async () => {
      mockGetPage.mockResolvedValueOnce({ expenses: [], hasMore: false });
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockGetPage).toHaveBeenCalledWith(
        "u1",
        UBER.createdAt,
        EXPENSES_PAGE_SIZE,
      );
    });

    it("appends fetched expenses to allExpenses", async () => {
      const older = {
        ...makeExpense("e-old", "2025-12-01"),
        description: "Antiguo",
      };
      mockGetPage.mockResolvedValueOnce({ expenses: [older], hasMore: false });
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.allExpenses.map((e) => e.id)).toContain("e-old");
    });

    it("updates hasMore after load", async () => {
      mockGetPage.mockResolvedValueOnce({
        expenses: [makeExpense("e-old")],
        hasMore: false,
      });
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
    });

    it("sets loadMoreError on rejection", async () => {
      mockGetPage.mockRejectedValueOnce(new Error("Sin conexión"));
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.loadMoreError).toBe("Sin conexión");
    });

    it("is a no-op when no cursor (empty list)", async () => {
      fakeSubscribe([]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockGetPage).not.toHaveBeenCalled();
    });
  });

  describe("openEdit / closeEdit", () => {
    it("openEdit pre-fills all four editForm fields", () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      act(() => {
        result.current.openEdit(UBER);
      });

      expect(result.current.editingExpense).toBe(UBER);
      expect(result.current.editForm.description).toBe(UBER.description);
      expect(result.current.editForm.amount).toBe(String(UBER.amount));
      expect(result.current.editForm.category).toBe(UBER.category);
      expect(result.current.editForm.date).toBe(UBER.date);
    });

    it("closeEdit nullifies editingExpense", () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      act(() => {
        result.current.openEdit(UBER);
      });
      act(() => {
        result.current.closeEdit();
      });

      expect(result.current.editingExpense).toBeNull();
    });
  });

  describe("handleSaveExpense", () => {
    it("throws on blank description", async () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      act(() => {
        result.current.openEdit(UBER);
      });
      act(() => {
        result.current.setEditField({ description: "  " });
      });

      await expect(
        act(async () => {
          await result.current.handleSaveExpense();
        }),
      ).rejects.toThrow("La descripción no puede estar vacía.");
    });

    it("throws on invalid amount", async () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      act(() => {
        result.current.openEdit(UBER);
      });
      act(() => {
        result.current.setEditField({ amount: "0" });
      });

      await expect(
        act(async () => {
          await result.current.handleSaveExpense();
        }),
      ).rejects.toThrow("Ingresa un monto válido mayor a 0.");
    });

    it("throws on missing date", async () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      act(() => {
        result.current.openEdit(UBER);
      });
      act(() => {
        result.current.setEditField({ date: "" });
      });

      await expect(
        act(async () => {
          await result.current.handleSaveExpense();
        }),
      ).rejects.toThrow("Selecciona una fecha.");
    });

    it("calls updateExpense and patches moreExpenses on success", async () => {
      mockUpdate.mockResolvedValue(undefined);
      mockGetPage.mockResolvedValueOnce({ expenses: [UBER], hasMore: false });
      mockSubscribe.mockImplementation(
        (_uid: string, callback: (e: Expense[]) => void) => {
          callback([makeExpense("cursor")]);
          return vi.fn();
        },
      );
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });
      act(() => {
        result.current.openEdit(UBER);
      });
      await act(async () => {
        await result.current.handleSaveExpense();
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        "u1",
        UBER.id,
        expect.objectContaining({
          description: UBER.description,
          amount: UBER.amount,
        }),
      );
    });
  });

  describe("handleDelete", () => {
    it("calls deleteExpense and removes entry from moreExpenses", async () => {
      mockDelete.mockResolvedValue(undefined);
      mockSubscribe.mockImplementation(
        (_uid: string, callback: (e: Expense[]) => void) => {
          callback([makeExpense("cursor")]);
          return vi.fn();
        },
      );
      mockGetPage.mockResolvedValueOnce({ expenses: [UBER], hasMore: false });
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(
        result.current.allExpenses.find((e) => e.id === UBER.id),
      ).toBeDefined();

      await act(async () => {
        await result.current.handleDelete(UBER);
      });

      expect(mockDelete).toHaveBeenCalledWith("u1", UBER.id);
      expect(
        result.current.allExpenses.find((e) => e.id === UBER.id),
      ).toBeUndefined();
    });

    it("sets deleteError on failure", async () => {
      mockDelete.mockRejectedValue(new Error("Sin conexión"));
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      await act(async () => {
        await result.current.handleDelete(UBER);
      });

      expect(result.current.deleteError).toBe("Sin conexión");
    });
  });

  describe("toggleMonth", () => {
    it("flips expansion state for a month", () => {
      fakeSubscribe([UBER]);
      const { result } = renderHook(() => useExpenseList("u1"));

      const month = result.current.grouped[0]?.[0];
      if (!month) throw new Error("No grouped months");

      const initialExpanded = result.current.monthExpandedMap[month];

      act(() => {
        result.current.toggleMonth(month);
      });

      expect(result.current.monthExpandedMap[month]).toBe(!initialExpanded);
    });
  });
});
