import type { ErrorCode } from "@lv/contracts";

/**
 * Erreur metier typee. Le code est contractuel (packages/contracts/errors.ts),
 * le message est destine a l'utilisateur final, `details` est optionnel et
 * ne doit jamais contenir de donnee sensible.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }

  get statusCode(): number {
    switch (this.code) {
      case "unauthenticated":
        return 401;
      case "forbidden":
        return 403;
      case "not_found":
        return 404;
      case "validation_failed":
        return 422;
      case "conflict":
      case "idempotency_key_reused":
        return 409;
      case "rate_limited":
        return 429;
      case "unavailable":
        return 503;
      case "internal":
        return 500;
    }
  }
}

export const notFound = (what = "Ressource"): DomainError =>
  new DomainError("not_found", `${what} introuvable.`);
export const unauthenticated = (): DomainError =>
  new DomainError("unauthenticated", "Authentification requise.");
export const forbidden = (): DomainError => new DomainError("forbidden", "Action non autorisee.");
