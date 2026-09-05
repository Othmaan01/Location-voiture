import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { SearchFilters } from "@/lib/search-params";
import type {
  Agency,
  City,
  CityCoverage,
  Review,
  Vehicle,
  VehicleSearchResult,
} from "@/types/database";

/**
 * Toutes les fonctions de ce module degradent proprement :
 * si Supabase n'est pas configure (premier clone du projet, build de preview),
 * elles renvoient des donnees vides plutot que de faire echouer le rendu.
 */

export interface SearchResponse {
  items: VehicleSearchResult[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export async function searchVehicles(filters: SearchFilters): Promise<SearchResponse> {
  const empty: SearchResponse = {
    items: [],
    total: 0,
    page: filters.page,
    perPage: filters.perPage,
    pageCount: 0,
  };
  if (!isSupabaseConfigured) return empty;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_vehicles", {
    p_lat: filters.lat ?? null,
    p_lng: filters.lng ?? null,
    p_radius_km: filters.radiusKm,
    p_query: filters.q ?? null,
    p_city_slug: filters.citySlug ?? null,
    p_categories: filters.categories.length ? filters.categories : null,
    p_transmissions: filters.transmissions.length ? filters.transmissions : null,
    p_fuels: filters.fuels.length ? filters.fuels : null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_min_seats: filters.minSeats ?? null,
    p_options: filters.options.length ? filters.options : null,
    p_sort: filters.sort,
    p_limit: filters.perPage,
    p_offset: (filters.page - 1) * filters.perPage,
  });

  if (error || !data) {
    if (error) console.error("[searchVehicles]", error.message);
    return empty;
  }

  const items = data as VehicleSearchResult[];
  const total = items.length > 0 ? Number(items[0].total_count) : 0;

  return {
    items,
    total,
    page: filters.page,
    perPage: filters.perPage,
    pageCount: Math.max(Math.ceil(total / filters.perPage), 1),
  };
}

export async function getCityCoverage(limit = 120): Promise<CityCoverage[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("city_coverage", { p_limit: limit });
  if (error || !data) return [];
  return (data as CityCoverage[]).map((row) => ({
    ...row,
    agency_count: Number(row.agency_count),
    vehicle_count: Number(row.vehicle_count),
  }));
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.from("cities").select("*").eq("slug", slug).maybeSingle();
  return (data as City | null) ?? null;
}

export async function listCities(limit = 500): Promise<City[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("cities")
    .select("*")
    .order("population", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as City[] | null) ?? [];
}

export interface AgencyDetail extends Agency {
  vehicles: Vehicle[];
  reviews: (Review & { author_name: string | null })[];
}

export async function getAgencyBySlug(slug: string): Promise<AgencyDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!agency) return null;

  const [{ data: vehicles }, { data: reviews }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("agency_id", (agency as Agency).id)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("price_per_day", { ascending: true }),
    supabase
      .from("reviews")
      .select("*")
      .eq("agency_id", (agency as Agency).id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    ...(agency as Agency),
    vehicles: (vehicles as Vehicle[] | null) ?? [],
    reviews: ((reviews as Review[] | null) ?? []).map((review) => ({
      ...review,
      author_name: null,
    })),
  };
}

export interface VehicleDetail extends Vehicle {
  agency: Agency;
}

export async function getVehicleById(id: string): Promise<VehicleDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();

  const { data } = await supabase
    .from("vehicles")
    .select("*, agency:agencies(*)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Vehicle & { agency: Agency | null };
  if (!row.agency) return null;
  return { ...row, agency: row.agency };
}

export async function getSimilarVehicles(
  vehicle: Pick<Vehicle, "id" | "category">,
  citySlug: string | null,
  limit = 4,
): Promise<VehicleSearchResult[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  let query = supabase
    .from("vehicle_search_view")
    .select("*")
    .eq("category", vehicle.category)
    .neq("id", vehicle.id)
    .limit(limit);

  if (citySlug) query = query.eq("city_slug", citySlug);

  const { data } = await query;
  return ((data as VehicleSearchResult[] | null) ?? []).map((item) => ({
    ...item,
    distance_km: null,
    total_count: 0,
  }));
}

/** Vehicules mis en avant pour la page d'accueil. */
export async function getFeaturedVehicles(limit = 6): Promise<VehicleSearchResult[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("vehicle_search_view")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("rating_average", { ascending: false })
    .limit(limit);

  return ((data as VehicleSearchResult[] | null) ?? []).map((item) => ({
    ...item,
    distance_km: null,
    total_count: 0,
  }));
}

export interface PlatformStats {
  agencies: number;
  vehicles: number;
  cities: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  if (!isSupabaseConfigured) return { agencies: 0, vehicles: 0, cities: 0 };
  const supabase = createPublicClient();

  const [agencies, vehicles, cities] = await Promise.all([
    supabase.from("agencies").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("cities").select("id", { count: "exact", head: true }),
  ]);

  return {
    agencies: agencies.count ?? 0,
    vehicles: vehicles.count ?? 0,
    cities: cities.count ?? 0,
  };
}
