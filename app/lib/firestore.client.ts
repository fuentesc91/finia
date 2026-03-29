import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "~/lib/firebase.client";

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
