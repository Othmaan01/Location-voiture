import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Client Supabase cote serveur (Server Components, Route Handlers, Server Actions).
 * La session de l'utilisateur est lue et rafraichie via les cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Appele depuis un Server Component : le proxy se charge
          // deja de rafraichir la session, on peut ignorer.
        }
      },
    },
  });
}

/**
 * Client Supabase PUBLIC : cle anon, aucun cookie lu.
 *
 * C'est ce qui permet aux pages publiques (accueil, ville, agence, vehicule)
 * de rester statiques / ISR : des qu'une page appelle `cookies()`, Next.js
 * la bascule en rendu dynamique et `generateStaticParams` devient inutile.
 * Ces pages n'affichent que du contenu publie, lisible par le role `anon`
 * d'apres les policies RLS.
 */
export function createPublicClient() {
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client "service role" : contourne RLS.
 * A n'utiliser QUE dans du code serveur de confiance (webhook Stripe, taches
 * d'administration). Ne jamais l'importer dans un composant client.
 */
export function createAdminClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : impossible de creer le client d'administration.",
    );
  }

  return createServerClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
