/** Variables publiques du site. Le site ne detient aucun secret : il ne parle qu'a l'API publique. */
function read(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const publicEnv = {
  apiUrl: read("NEXT_PUBLIC_API_URL", "https://location-voiture-api-staging.fly.dev").replace(
    /\/$/,
    "",
  ),
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  siteName: read("NEXT_PUBLIC_SITE_NAME", "Location Voiture"),
} as const;
