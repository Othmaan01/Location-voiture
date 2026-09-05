import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Agency, Profile } from "@/types/database";

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
}

/** Renvoie l'utilisateur courant et son profil, ou null s'il n'est pas connecte. */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

/** Impose une session valide, sinon redirige vers la connexion. */
export async function requireSession(nextPath = "/"): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    redirect(`/connexion?suivant=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

/** Impose un compte professionnel et renvoie son agence principale. */
export async function requirePro(): Promise<{ session: SessionContext; agency: Agency | null }> {
  const session = await requireSession("/dashboard");

  if (session.profile && session.profile.role !== "pro" && session.profile.role !== "admin") {
    redirect("/compte");
  }

  const supabase = await createClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("owner_id", session.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { session, agency: (agency as Agency | null) ?? null };
}
