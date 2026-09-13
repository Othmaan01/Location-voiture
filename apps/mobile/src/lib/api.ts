import { ApiErrorSchema, type ApiError } from "@lv/contracts";
import type { z } from "zod";

import { env } from "./env";
import { supabase } from "./supabase";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError | null,
  ) {
    super(
      body?.error.message ??
        (status >= 500
          ? "Le service est momentanément indisponible. Réessayez dans un instant."
          : `Erreur ${status}`),
    );
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

  const method = options.method ?? "GET";
  const url = `${env.EXPO_PUBLIC_API_URL}${path}`;
  const init = {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal ?? null,
  };

  // Reveil du serveur (2026-09-13) : si la requete n'a pas atteint l'API (reponse 502/503/504 du
  // proxy sans corps d'erreur de l'API, ou coupure reseau sur une lecture), on reessaie quelques
  // secondes. Sans risque de doublon : une requete qui n'est pas arrivee n'a rien fait.
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (method === "GET" && attempt < WAKE_RETRY_DELAYS_MS.length && !options.signal?.aborted) {
        await wait(WAKE_RETRY_DELAYS_MS[attempt]!);
        continue;
      }
      throw error;
    }
    const text = await response.text();
    const json = parseJson(text);
    if (response.ok) return schema.parse(json);
    const parsed = ApiErrorSchema.safeParse(json);
    const neverReachedApi = !parsed.success && [502, 503, 504].includes(response.status);
    if (neverReachedApi && attempt < WAKE_RETRY_DELAYS_MS.length && !options.signal?.aborted) {
      await wait(WAKE_RETRY_DELAYS_MS[attempt]!);
      continue;
    }
    throw new ApiRequestError(response.status, parsed.success ? parsed.data : null);
  }
}

/** ~17 s au total : couvre un redemarrage complet du serveur apres une maintenance. */
const WAKE_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Les pages d'erreur du proxy ne sont pas du JSON : on ne plante pas en les lisant. */
function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Reveille le serveur des l'ouverture de l'application, sans attendre la premiere action :
 * le temps que l'utilisateur touche l'ecran, l'API est prete. Silencieux en cas d'echec.
 */
export function wakeServer(): void {
  void fetch(`${env.EXPO_PUBLIC_API_URL}/health`).catch(() => undefined);
}
