import type { MetadataRoute } from "next";

import { api } from "@/lib/api";
import { publicEnv } from "@/lib/env";

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
  const [cities, feed] = await Promise.all([api.cities(), api.feed("all", 50)]);
  return [
    ...staticRoutes,
    ...(cities?.cities ?? []).map((c) => ({
      url: `${base}/location-voiture/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...(feed?.items ?? []).map((l) => ({
      url: `${base}/loueurs/${l.id}`,
      lastModified: new Date(l.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
