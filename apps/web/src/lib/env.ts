/**
 * Acces centralise aux variables d'environnement.
 *
 * On ne jette pas d'erreur au chargement du module : le projet doit pouvoir
 * se builder (pages statiques, page d'accueil) meme sans backend configure.
 * Les valeurs manquantes sont signalees la ou elles sont reellement necessaires
 * via `assertSupabaseConfigured()`.
 */

function read(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const publicEnv = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  siteName: read("NEXT_PUBLIC_SITE_NAME", "RentMap"),
  mapStyleUrl: read(
    "NEXT_PUBLIC_MAP_STYLE_URL",
    // Fond de carte gratuit, sans cle d'API, base sur OpenStreetMap.
    "https://tiles.openfreemap.org/styles/liberty",
  ),
} as const;

export const serverEnv = {
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  stripePriceStarter: read("STRIPE_PRICE_STARTER"),
  stripePricePro: read("STRIPE_PRICE_PRO"),
} as const;

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase n'est pas configure. Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir .env.example).",
    );
  }
}
