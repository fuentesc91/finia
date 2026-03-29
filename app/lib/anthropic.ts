export function validateAnthropicKey(key: string): { valid: boolean; error?: string } {
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk-ant-")) {
    return { valid: false, error: "La clave debe comenzar con sk-ant-" };
  }
  if (trimmed.length < 40) {
    return { valid: false, error: "La clave parece demasiado corta. Verifica que la copiaste completa." };
  }
  return { valid: true };
}

export function maskAnthropicKey(key: string): string {
  const prefix = key.slice(0, 10);
  return `${prefix}${"•".repeat(8)}`;
}
