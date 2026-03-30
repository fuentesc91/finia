import { categorizeExpense } from "~/lib/categorize.server";
import type { Route } from "./+types/expenses";

/**
 * Resource route — no UI component.
 * Receives description + amount + apiKey, asks Claude for a category,
 * and returns { category } or { error }.
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const description = (formData.get("description") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const apiKey = (formData.get("apiKey") as string)?.trim();

  if (!description || isNaN(amount) || amount <= 0 || !apiKey) {
    return { error: "Datos incompletos." };
  }

  try {
    const category = await categorizeExpense(apiKey, description);
    return { category };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
