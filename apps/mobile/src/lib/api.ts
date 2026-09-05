import { ApiErrorSchema, type ApiError } from "@lv/contracts";
import type { z } from "zod";

import { env } from "./env";
import { supabase } from "./supabase";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError | null,
  ) {
    super(body?.error.message ?? `Erreur ${status}`);
    this.name = "ApiRequestError";
  }
}

interface RequestOptions<TBody> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  /** Cle d'idempotence pour les creations (reservations). */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * Client HTTP minimal vers l'API : joint le token de session, valide la
 * reponse avec le schema Zod partage, et type les erreurs.
 */
export async function apiRequest<TSchema extends z.ZodType, TBody = unknown>(
  path: string,
  schema: TSchema,
  options: RequestOptions<TBody> = {},
): Promise<z.infer<TSchema>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (data.session?.access_token) headers["Authorization"] = `Bearer ${data.session.access_token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal ?? null,
  });

  const text = await response.text();
  const json: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    throw new ApiRequestError(response.status, parsed.success ? parsed.data : null);
  }
  return schema.parse(json);
}
