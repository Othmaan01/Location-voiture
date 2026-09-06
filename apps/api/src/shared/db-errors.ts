import { DomainError } from "./errors.js";

interface PgError {
  code?: string;
  message?: string;
  constraint_name?: string;
}

/**
 * Drizzle enveloppe les erreurs Postgres (DrizzleQueryError -> cause). On remonte
 * la chaine des causes jusqu'a trouver une erreur portant un code SQLSTATE.
 */
function asPg(error: unknown): PgError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    if ("code" in current && typeof (current as PgError).code === "string")
      return current as PgError;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return asPg(error)?.code === "23505";
}

/** Un trigger metier (`raise exception ... using errcode = 'check_violation'`) devient un 409 lisible. */
export function isBusinessRuleViolation(error: unknown): boolean {
  return asPg(error)?.code === "23514";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return asPg(error)?.code === "23503";
}

/** Convertit une erreur Postgres attendue en DomainError ; relance les autres. */
export function translateDbError(
  error: unknown,
  conflictMessage = "Operation impossible dans l'etat actuel.",
): never {
  if (isBusinessRuleViolation(error)) {
    throw new DomainError("conflict", asPg(error)?.message ?? conflictMessage);
  }
  if (isUniqueViolation(error)) {
    throw new DomainError("conflict", conflictMessage);
  }
  if (isForeignKeyViolation(error)) {
    throw new DomainError("conflict", "Des donnees liees empechent cette operation.");
  }
  throw error;
}
