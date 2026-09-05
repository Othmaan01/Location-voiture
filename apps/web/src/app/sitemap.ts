import type { MetadataRoute } from "next";

import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";
import { listCities } from "@/lib/queries";
import type { Agency, Vehicle } from "@/types/database";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recherche`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/villes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/tarifs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/pro`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  if (!isSupabaseConfigured) return staticRoutes;

  const supabase = createPublicClient();
  const [cities, { data: agencies }, { data: vehicles }] = await Promise.all([
    listCities(500),
    supabase.from("agencies").select("slug, updated_at").eq("status", "published"),
    supabase.from("vehicles").select("id, updated_at").eq("status", "published").limit(5000),
  ]);

  return [
    ...staticRoutes,
    ...cities.map((city) => ({
      url: `${base}/location-voiture/${city.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...((agencies as Pick<Agency, "slug" | "updated_at">[] | null) ?? []).map((agency) => ({
      url: `${base}/agence/${agency.slug}`,
      lastModified: new Date(agency.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...((vehicles as Pick<Vehicle, "id" | "updated_at">[] | null) ?? []).map((vehicle) => ({
      url: `${base}/vehicule/${vehicle.id}`,
      lastModified: new Date(vehicle.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
