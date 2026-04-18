import type { Expense } from "~/types/expense";
import type { BudgetPeriodType } from "~/types/budget";

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function groupByMonth(expenses: Expense[]): [string, Expense[]][] {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

export function monthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-15`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

export function periodDays(type: BudgetPeriodType): number {
  if (type === "weekly") return 7;
  if (type === "biweekly") return 15;
  return 30;
}

export function normalizeFirestoreError(err: unknown): Error {
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
