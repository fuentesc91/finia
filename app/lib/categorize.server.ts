import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type Category } from "~/types/expense";

const SYSTEM_PROMPT = `Eres un categorizador de gastos personales.
Dado la descripción de un gasto, responde ÚNICAMENTE con el nombre de una categoría de la siguiente lista:

Alimentación, Transporte, Entretenimiento, Salud, Servicios, Hogar, Ropa, Otros

Reglas estrictas:
- Devuelve SOLO el nombre exacto de la categoría, sin puntuación ni texto adicional
- Si no puedes determinar la categoría, devuelve "Otros"
- La respuesta debe ser exactamente uno de los 8 valores del listado`;

/**
 * Asks Claude to assign a category to an expense description.
 * Returns "Otros" only when Claude responds with an unrecognized value.
 * Throws a Spanish user-facing error for any real API failure.
 */
export async function categorizeExpense(apiKey: string, description: string): Promise<Category> {
  const client = new Anthropic({ apiKey });

  let text: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Gasto: ${description}` }],
    });
    text =
      message.content[0] && message.content[0].type === "text"
        ? message.content[0].text.trim()
        : "";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("Tu clave de Claude no es válida. Revisa la configuración.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Límite de uso alcanzado. Intenta en unos minutos.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error("Error de conexión. Intenta de nuevo.");
    }
    throw new Error("Error al categorizar. Intenta de nuevo.");
  }

  // If the model returns something outside the defined list, fall back silently.
  return (CATEGORIES as readonly string[]).includes(text) ? (text as Category) : "Otros";
}
