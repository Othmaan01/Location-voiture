import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  CitiesResponseSchema,
  FavoritesResponseSchema,
  FeedResponseSchema,
  LoueurProfileSchema,
  PublicVehicleDetailSchema,
  VehicleAvailabilitySchema,
  SearchResponseSchema,
  type FeedTab,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { useSession } from "./session";

const Empty = z.null();

export const publicKeys = {
  feed: (tab: FeedTab, origin: { lat: number; lng: number } | null) =>
    ["feed", tab, origin?.lat ?? null, origin?.lng ?? null] as const,
  loueur: (id: string, period: { from: string; to: string } | null) =>
    ["loueurs", id, period?.from ?? null, period?.to ?? null] as const,
  search: (params: Record<string, string>) => ["search", params] as const,
  vehicle: (id: string, period: { from: string; to: string } | null) =>
    ["vehicles", id, period?.from ?? null, period?.to ?? null] as const,
  cities: ["cities"] as const,
  favorites: ["favorites"] as const,
};

const qs = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export function useFeed(tab: FeedTab, origin: { lat: number; lng: number } | null) {
  return useInfiniteQuery({
    queryKey: publicKeys.feed(tab, origin),
    queryFn: ({ pageParam }) =>
      apiRequest(
        `/v1/feed?${qs({ tab, lat: origin?.lat, lng: origin?.lng, limit: 20, cursor: pageParam })}`,
        FeedResponseSchema,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}

export function useLoueur(id: string, period: { from: string; to: string } | null) {
  return useQuery({
    queryKey: publicKeys.loueur(id, period),
    queryFn: () =>
      apiRequest(
        `/v1/loueurs/${id}?${qs({ from: period?.from, to: period?.to })}`,
        LoueurProfileSchema,
      ),
  });
}

export interface SearchParams {
  citySlug?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  from?: string;
  to?: string;
  categories?: string;
  transmission?: string;
  fuel?: string;
  minSeats?: number;
  maxDailyCents?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "distance";
  q?: string;
}

export function useSearch(params: SearchParams, enabled: boolean) {
  const clean = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
  return useQuery({
    queryKey: publicKeys.search(clean),
    queryFn: () => apiRequest(`/v1/search?${qs({ ...clean, limit: 50 })}`, SearchResponseSchema),
    enabled,
    staleTime: 30_000,
  });
}

/** Fiche vehicule publique : toutes les photos, le tarif, l'agence, le loueur ; disponibilite si dates. */
export function useVehicle(id: string, period: { from: string; to: string } | null) {
  return useQuery({
    queryKey: publicKeys.vehicle(id, period),
    queryFn: () =>
      apiRequest(
        `/v1/catalog/vehicles/${id}${period ? `?${qs({ from: period.from, to: period.to })}` : ""}`,
        PublicVehicleDetailSchema,
      ),
    staleTime: 60_000,
  });
}

/** Intervalles occupes d'un vehicule (reservations fermes, blocages) : le meme calendrier partout. */
export function useVehicleAvailability(
  vehicleId: string,
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["vehicles", vehicleId, "availability", from, to] as const,
    queryFn: () =>
      apiRequest(
        `/v1/catalog/vehicles/${vehicleId}/availability?${qs({ from, to })}`,
        VehicleAvailabilitySchema,
      ),
    enabled: enabled && !!vehicleId,
    staleTime: 30_000,
  });
}

export function useCities() {
  return useQuery({
    queryKey: publicKeys.cities,
    queryFn: () => apiRequest("/v1/cities", CitiesResponseSchema),
    staleTime: 24 * 3600_000,
  });
}

export function useFavorites() {
  const { session } = useSession();
  return useQuery({
    queryKey: publicKeys.favorites,
    queryFn: () => apiRequest("/v1/me/favorites", FavoritesResponseSchema),
    enabled: !!session,
  });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, on }: { vehicleId: string; on: boolean }) =>
      apiRequest(`/v1/me/favorites/${vehicleId}`, Empty, { method: on ? "PUT" : "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: publicKeys.favorites }),
  });
}
