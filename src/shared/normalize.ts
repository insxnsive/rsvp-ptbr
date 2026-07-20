import type { GuestGroup } from "./types.js";

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function normalizeHeader(value: string): string {
  return normalizeName(value).replace(/\s+/g, "");
}

export function normalizeGuestGroup(value: string): GuestGroup | null {
  const normalized = normalizeName(value);
  if (normalized === "adulto" || normalized === "adultos") {
    return "adulto";
  }
  if (normalized === "crianca" || normalized === "criancas") {
    return "crianca";
  }
  return null;
}
