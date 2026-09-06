import {
  CitiesResponseSchema,
  FeedResponseSchema,
  LoueurProfileSchema,
  PlansResponseSchema,
  ReviewsResponseSchema,
  SearchResponseSchema,
} from "@lv/contracts";
import type { z } from "zod";

import { publicEnv } from "@/lib/env";

/**
 * Client de l'API publique, cote serveur (SSR / ISR). Les reponses sont validees avec les
 * schemas partages : le site ne peut pas deriver du contrat du moteur sans casser le build.
 */
async function get<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  revalidate = 300,
): Promise<z.infer<TSchema> | null> {
  try {
    const response = await fetch(`${publicEnv.apiUrl}${path}`, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!response.ok) return null;
    return schema.parse(await response.json());
  } catch {
    return null;
  }
}

export const api = {
  feed: (tab = "all", limit = 24) => get(`/v1/feed?tab=${tab}&limit=${limit}`, FeedResponseSchema),
  loueur: (id: string) => get(`/v1/loueurs/${id}`, LoueurProfileSchema),
  reviews: (id: string) => get(`/v1/loueurs/${id}/reviews`, ReviewsResponseSchema),
  cities: () => get("/v1/cities", CitiesResponseSchema, 3600),
  search: (params: URLSearchParams) =>
    get(`/v1/search?${params.toString()}`, SearchResponseSchema, 120),
  plans: () => get("/v1/plans", PlansResponseSchema, 3600),
};

export type Feed = NonNullable<Awaited<ReturnType<typeof api.feed>>>;
export type Loueur = NonNullable<Awaited<ReturnType<typeof api.loueur>>>;
export type SearchResults = NonNullable<Awaited<ReturnType<typeof api.search>>>;
