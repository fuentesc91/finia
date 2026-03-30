import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "~/lib/firebase.client";
import { CATEGORIES, type Category, type Expense } from "~/types/expense";

function normalizeFirestoreError(err: unknown): Error {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const messages: Record<string, string> = {
      "permission-denied": "No tienes permiso para realizar esta acción.",
      "unavailable": "Servicio no disponible. Verifica tu conexión.",
      "not-found": "No se encontró el documento.",
    };
    return new Error(messages[code] ?? "Error al acceder a los datos. Intenta de nuevo.");
  }
  return new Error("Error desconocido. Intenta de nuevo.");
}

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

/**
 * Subscribes to the user's expenses ordered by date descending.
 * Calls `callback` immediately with the current list and again on every change.
 * Returns the unsubscribe function to clean up the listener.
 */
export function subscribeToExpenses(
  uid: string,
  callback: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    query(expensesRef(uid), orderBy("date", "desc")),
    (snap) => callback(snap.docs.map(mapExpenseDoc)),
    (err) => onError?.(normalizeFirestoreError(err))
  );
}

export async function getExpenses(uid: string): Promise<Expense[]> {
  try {
    const snap = await getDocs(query(expensesRef(uid), orderBy("date", "desc")));
    return snap.docs.map(mapExpenseDoc);
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}
