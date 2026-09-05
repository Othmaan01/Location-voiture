import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Proxy Next.js 16 (anciennement `middleware.ts`).
 * Rafraichit la session Supabase et protege les routes privees
 * AVANT le rendu. La securite reelle reste assuree par les policies RLS.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - les fichiers statiques Next.js
     * - les images et polices
     * - le webhook Stripe (le corps brut doit rester intouche)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
