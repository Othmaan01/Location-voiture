import { z } from "zod";

/** Codes d'erreur stables exposes par l'API. Le message est informatif, le code est contractuel. */
export const ErrorCodeSchema = z.enum([
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation_failed",
  "conflict",
  "rate_limited",
  "idempotency_key_reused",
  /** Un service externe (annuaire des entreprises, stockage) ne repond pas : reessayer plus tard. */
  "unavailable",
  "internal",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: ErrorCodeSchema,
        message: z.string(),
        requestId: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;
