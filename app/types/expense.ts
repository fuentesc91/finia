export const CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Servicios",
  "Hogar",
  "Ropa",
  "Otros",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string; // "YYYY-MM-DD"
  createdAt: Date;
}
