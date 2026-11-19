import { z } from "zod";

/** Verifica se o texto é uma URL HTTP/HTTPS válida (bloqueia javascript:, data:, etc.). */
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Verifica se o caminho é relativo ao próprio site (bloqueia protocol-relative //). */
export function isSafeLocalPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
  );
}

/** Aceita URL HTTP(S) ou caminho relativo seguro do próprio site. */
export function isSafeUrlOrPath(value: string): boolean {
  return isHttpUrl(value) || isSafeLocalPath(value);
}

export const httpUrlSchema = z
  .string()
  .trim()
  .refine(isHttpUrl, "URL inválida; use http:// ou https://");

export const safeUrlOrPathSchema = z
  .string()
  .trim()
  .refine(isSafeUrlOrPath, "Caminho ou URL inválida");

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function safeAvatarUrl(value: string | null | undefined): string | null {
  return value && isSafeUrlOrPath(value)
    ? value.replace(/["\\\n\r]/g, "")
    : null;
}
