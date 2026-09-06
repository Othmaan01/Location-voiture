import * as SecureStore from "expo-secure-store";
import type { Href } from "expo-router";
import { create } from "zustand";
import type { MeResponse } from "@lv/contracts";

/**
 * Mode de l'app (D9) : un seul compte, trois espaces. Le mode est un confort d'affichage
 * choisi a l'inscription et basculable depuis le profil ; jamais une autorisation
 * (le serveur revérifie tout). Persisté localement, par utilisateur.
 */
export type AppMode = "client" | "pro" | "admin";

export const MODE_LABEL: Record<AppMode, string> = {
  client: "Client",
  pro: "Loueur",
  admin: "Admin",
};

/** Onglets de la capsule par mode ; « profil » est commun. L'ordre est celui de la capsule. */
export const MODE_TABS: Record<AppMode, readonly string[]> = {
  client: ["index", "explorer", "locations", "favoris", "profil"],
  pro: ["pro-home", "pro-bookings", "pro-vehicles", "pro-calendar", "profil"],
  admin: ["admin-verifications", "admin-loueurs", "profil"],
};

export const MODE_HOME: Record<AppMode, Href> = {
  client: "/(tabs)",
  pro: "/(tabs)/pro-home",
  admin: "/(tabs)/admin-verifications",
};

const KEY = "lv.mode";

interface Persisted {
  mode: AppMode;
  organizationId: string | null;
  userId: string | null;
}

interface ModeState extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: AppMode) => void;
  setOrganization: (organizationId: string | null) => void;
  /** Applique les valeurs par defaut a la premiere connexion d'un utilisateur. */
  applyUser: (me: MeResponse) => void;
}

async function persist(state: Persisted) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible : le mode vit le temps de la session.
  }
}

export const useMode = create<ModeState>((set, get) => ({
  mode: "client",
  organizationId: null,
  userId: null,
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
      const mode: AppMode =
        parsed.mode === "pro" || parsed.mode === "admin" ? parsed.mode : "client";
      set({
        mode,
        organizationId: parsed.organizationId ?? null,
        userId: parsed.userId ?? null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setMode(mode) {
    const { organizationId, userId } = get();
    set({ mode });
    void persist({ mode, organizationId, userId });
  },
  setOrganization(organizationId) {
    const { mode, userId } = get();
    set({ organizationId });
    void persist({ mode, organizationId, userId });
  },
  applyUser(me) {
    const state = get();
    const memberships = me.memberships;
    let { mode, organizationId } = state;
    if (state.userId !== me.userId) {
      mode = me.preferredMode === "pro" ? "pro" : "client";
      organizationId = memberships[0]?.organizationId ?? null;
    }
    if (mode === "admin" && !me.platformRole) mode = "client";
    if (organizationId && !memberships.some((m) => m.organizationId === organizationId))
      organizationId = memberships[0]?.organizationId ?? null;
    if (!organizationId && memberships[0]) organizationId = memberships[0].organizationId;
    if (
      mode !== state.mode ||
      organizationId !== state.organizationId ||
      state.userId !== me.userId
    ) {
      set({ mode, organizationId, userId: me.userId });
      void persist({ mode, organizationId, userId: me.userId });
    }
  },
}));
