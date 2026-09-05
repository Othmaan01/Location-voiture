import { createClient } from "@supabase/supabase-js";

import { env } from "./env";
import { secureStorage } from "./secure-storage";

/**
 * Client Supabase mobile : uniquement pour l'authentification (session, refresh,
 * OAuth) et les uploads signes. Aucune lecture/ecriture metier directe : tout
 * passe par l'API (ADR-0003).
 */
export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
