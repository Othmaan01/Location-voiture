import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/** Prefixes de routes reservees aux comptes professionnels. */
const PRO_ROUTES = ["/dashboard"];
/** Prefixes de routes reservees a tout compte connecte. */
const AUTHENTICATED_ROUTES = ["/compte"];
/** Routes d'authentification : un utilisateur deja connecte y est redirige. */
const AUTH_ROUTES = ["/connexion", "/inscription"];

/**
 * Rafraichit la session Supabase et applique les regles de routage.
 * Appele depuis `src/proxy.ts` (le "middleware" de Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT : ne rien executer entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsPro = PRO_ROUTES.some((p) => pathname.startsWith(p));
  const needsAuth = needsPro || AUTHENTICATED_ROUTES.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suivant", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/redirection";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (needsPro && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.role !== "pro" && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/compte";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
