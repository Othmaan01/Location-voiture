import { FRANCE_ZOOM } from "@/lib/constants";

export interface SearchFilters {
  q?: string;
  citySlug?: string;
  lat?: number;
  lng?: number;
  radiusKm: number;
  categories: string[];
  transmissions: string[];
  fuels: string[];
  options: string[];
  minPrice?: number;
  maxPrice?: number;
  minSeats?: number;
  sort: string;
  page: number;
  perPage: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const list = (value: string | string[] | undefined): string[] => {
  const raw = Array.isArray(value) ? value.join(",") : value;
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const num = (value: string | string[] | undefined): number | undefined => {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function parseSearchParams(params: RawSearchParams): SearchFilters {
  return {
    q: first(params.q) || undefined,
    citySlug: first(params.ville) || undefined,
    lat: num(params.lat),
    lng: num(params.lng),
    radiusKm: num(params.rayon) ?? 30,
    categories: list(params.categories),
    transmissions: list(params.boite),
    fuels: list(params.energie),
    options: list(params.options),
    minPrice: num(params.prix_min),
    maxPrice: num(params.prix_max),
    minSeats: num(params.places),
    sort: first(params.tri) ?? "pertinence",
    page: Math.max(num(params.page) ?? 1, 1),
    perPage: Math.min(Math.max(num(params.taille) ?? 24, 1), 60),
  };
}

/** Reconstruit une query string canonique a partir des filtres. */
export function buildSearchQuery(filters: Partial<SearchFilters>): string {
  const sp = new URLSearchParams();
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      sp.set(key, value.join(","));
      return;
    }
    sp.set(key, String(value));
  };

  set("q", filters.q);
  set("ville", filters.citySlug);
  set("lat", filters.lat);
  set("lng", filters.lng);
  if (filters.radiusKm && filters.radiusKm !== 30) set("rayon", filters.radiusKm);
  set("categories", filters.categories);
  set("boite", filters.transmissions);
  set("energie", filters.fuels);
  set("options", filters.options);
  set("prix_min", filters.minPrice);
  set("prix_max", filters.maxPrice);
  set("places", filters.minSeats);
  if (filters.sort && filters.sort !== "pertinence") set("tri", filters.sort);
  if (filters.page && filters.page > 1) set("page", filters.page);

  return sp.toString();
}

export function countActiveFilters(filters: SearchFilters): number {
  return (
    filters.categories.length +
    filters.transmissions.length +
    filters.fuels.length +
    filters.options.length +
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.maxPrice !== undefined ? 1 : 0) +
    (filters.minSeats !== undefined ? 1 : 0)
  );
}

/** Niveau de zoom initial de la carte en fonction du contexte de recherche. */
export function initialZoomFor(filters: SearchFilters): number {
  if (filters.lat !== undefined && filters.lng !== undefined) {
    if (filters.radiusKm <= 10) return 12;
    if (filters.radiusKm <= 30) return 10.5;
    if (filters.radiusKm <= 80) return 9;
    return 7.5;
  }
  return FRANCE_ZOOM;
}
