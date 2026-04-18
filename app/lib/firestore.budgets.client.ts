import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "~/lib/firebase.client";
import type { Budget, BudgetInput } from "~/types/budget";
import { type BudgetPeriod, type BudgetPeriodType } from "~/types/budget";
import { CATEGORIES, type Category } from "~/types/expense";
import { normalizeFirestoreError } from "~/lib/helpers";

const VALID_PERIOD_TYPES: BudgetPeriodType[] = ["weekly", "biweekly", "monthly"];

function budgetsRef(uid: string) {
  return collection(db, "users", uid, "budgets");
}

function mapBudgetDoc(d: { id: string; data: () => Record<string, unknown> }): Budget {
  const data = d.data();
  const rawPeriod = data.period as { type?: string } | undefined;
  const periodType = rawPeriod?.type as BudgetPeriodType | undefined;
  const period: BudgetPeriod = VALID_PERIOD_TYPES.includes(periodType as BudgetPeriodType)
    ? ({ type: periodType } as BudgetPeriod)
    : { type: "monthly" }; // safe fallback

  const rawCategory = data.category as string | null | undefined;
  const category: Category | null =
    rawCategory !== null && rawCategory !== undefined && (CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as Category)
      : null;

  return {
    id: d.id,
    period,
    category,
    amount: data.amount as number,
    createdAt: (data.createdAt as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
  };
}

export async function saveBudget(uid: string, input: BudgetInput): Promise<string> {
  try {
    const ref = await addDoc(budgetsRef(uid), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export async function updateBudget(
  uid: string,
  budgetId: string,
  input: Partial<BudgetInput>
): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid, "budgets", budgetId), {
      ...input,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export async function deleteBudget(uid: string, budgetId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "budgets", budgetId));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "not-found") {
      return;
    }
    throw normalizeFirestoreError(err);
  }
}

export async function getBudgets(uid: string): Promise<Budget[]> {
  try {
    const snap = await getDocs(query(budgetsRef(uid), orderBy("createdAt", "asc")));
    return snap.docs.map(mapBudgetDoc);
  } catch (err) {
    throw normalizeFirestoreError(err);
  }
}

export function subscribeToBudgets(
  uid: string,
  callback: (budgets: Budget[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    query(budgetsRef(uid), orderBy("createdAt", "asc")),
    (snap) => callback(snap.docs.map(mapBudgetDoc)),
    (err) => onError?.(normalizeFirestoreError(err))
  );
}
