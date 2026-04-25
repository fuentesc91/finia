import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  startAfter,
  where,
} from "firebase/firestore";
import { EXPENSES_PAGE_SIZE } from "~/config";

import { db } from "~/lib/firebase.client";
import { CATEGORIES, type Category, type Expense } from "~/types/expense";
import { normalizeFirestoreError } from "~/lib/helpers";

function settingsRef(uid: string) {
  return doc(db, "users", uid, "settings", "main");
}

export async function saveAnthropicKey(uid: string, apiKey: string, hasCredits: boolean): Promise<void> {
  try {
    await setDoc(settingsRef(uid), { anthropicApiKey: apiKey, hasCredits, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export interface AnthropicSettings {
  apiKey: string;
  hasCredits: boolean;
}

export async function getAnthropicSettings(uid: string): Promise<AnthropicSettings | null> {
  try {
    const snap = await getDoc(settingsRef(uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const apiKey = data?.anthropicApiKey as string | undefined;
    if (!apiKey) return null;
    return { apiKey, hasCredits: data?.hasCredits ?? true };
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export async function deleteAnthropicKey(uid: string): Promise<void> {
  try {
    await updateDoc(settingsRef(uid), { anthropicApiKey: deleteField() });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "not-found") {
      return; // key was already gone, no-op
    }
    throw normalizeFirestoreError(err);
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

function expensesRef(uid: string) {
  return collection(db, "users", uid, "expenses");
}

export async function saveExpense(
  uid: string,
  expense: { description: string; amount: number; category: Category; date: string }
): Promise<string> {
  try {
    const ref = await addDoc(expensesRef(uid), { ...expense, createdAt: serverTimestamp() });
    return ref.id;
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

function mapExpenseDoc(d: { id: string; data: () => Record<string, unknown> }): Expense {
  const data = d.data();
  const raw = data.category as string;
  const category: Category = (CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : "Otros";
  return {
    id: d.id,
    description: data.description as string,
    amount: data.amount as number,
    category,
    date: data.date as string,
    createdAt: (data.createdAt as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
  };
}

export function subscribeToExpensesForPeriod(
  uid: string,
  startDate: string,
  endDate: string,
  callback: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    query(
      expensesRef(uid),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    ),
    (snap) => callback(snap.docs.map(mapExpenseDoc)),
    (err) => onError?.(normalizeFirestoreError(err))
  );
}

export function subscribeToExpenses(
  uid: string,
  callback: (expenses: Expense[]) => void,
  onError?: (err: Error) => void,
  pageSize = EXPENSES_PAGE_SIZE
): () => void {
  return onSnapshot(
    query(expensesRef(uid), orderBy("createdAt", "desc"), limit(pageSize)),
    (snap) => callback(snap.docs.map(mapExpenseDoc)),
    (err) => onError?.(normalizeFirestoreError(err))
  );
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  updates: { description: string; amount: number; category: Category; date: string }
): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid, "expenses", expenseId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export async function deleteExpense(uid: string, expenseId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "expenses", expenseId));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "not-found") {
      return;
    }
    throw normalizeFirestoreError(err);
  }
}

export async function getExpensesPage(
  uid: string,
  afterDate: Date,
  pageSize = EXPENSES_PAGE_SIZE
): Promise<{ expenses: Expense[]; hasMore: boolean }> {
  try {
    const snap = await getDocs(
      query(
        expensesRef(uid),
        orderBy("createdAt", "desc"),
        startAfter(afterDate),
        limit(pageSize + 1),
      )
    );
    const hasMore = snap.docs.length > pageSize;
    const expenses = snap.docs.slice(0, pageSize).map(mapExpenseDoc);
    return { expenses, hasMore };
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}
