import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Point de retour des liens de confirmation e-mail et des connexions OAuth.
 * Echange le code contre une session, puis renvoie l'utilisateur vers son espace.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/redirection";

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_expire`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
