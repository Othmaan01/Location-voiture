import { DomainError } from "./errors.js";

interface PgError {
  code?: string;
  message?: string;
  constraint_name?: string;
}

function asPg(error: unknown): PgError | null {
  return typeof error === "object" && error !== null && "code" in error ? (error as PgError) : null;
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
