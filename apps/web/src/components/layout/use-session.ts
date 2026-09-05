"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserRole } from "@/types/database";

export interface ClientSession {
  userId: string;
  email: string | null;
  role: UserRole | null;
}

/**
 * Session lue cote navigateur.
 *
 * Volontairement cote client : cela evite d'appeler `cookies()` dans le layout
 * racine, ce qui rendrait TOUTES les pages dynamiques et empecherait la
 * generation statique des pages ville (l'atout SEO du projet).
 * Les pages protegees restent verrouillees par le proxy et par RLS.
 */
export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null);
  // Sans backend configure, il n'y a rien a charger : on part directement a false.
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    let active = true;

    async function hydrate(userId: string | undefined, email: string | null) {
      if (!userId) {
        if (active) setSession(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (active) {
        setSession({ userId, email, role: (data?.role as UserRole | undefined) ?? null });
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      void hydrate(data.user?.id, data.user?.email ?? null).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      void hydrate(next?.user?.id, next?.user?.email ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
