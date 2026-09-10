import { useRouter } from "expo-router";
import { create } from "zustand";

import { useFavorites, useRemoveFavorite, useSaveFavorite } from "@/lib/queries-public";
import { useSession } from "@/lib/session";

/**
 * Choix du groupe a l'enregistrement d'un favori (retour fondateur, 2026-09-10) : la feuille
 * est montee une fois a la racine ; n'importe quel coeur peut l'ouvrir.
 */
interface ChooserState {
  vehicleId: string | null;
  open: (vehicleId: string) => void;
  close: () => void;
}
export const useFavoriteChooser = create<ChooserState>((set) => ({
  vehicleId: null,
  open: (vehicleId) => set({ vehicleId }),
  close: () => set({ vehicleId: null }),
}));

/**
 * Le coeur, partout : retire si deja favori ; sinon enregistre tout de suite, ou propose un
 * groupe quand l'utilisateur en a cree. `move` ouvre le choix du groupe pour un favori existant.
 */
export function useFavoriteAction() {
  const router = useRouter();
  const { session } = useSession();
  const favorites = useFavorites();
  const save = useSaveFavorite();
  const remove = useRemoveFavorite();
  const open = useFavoriteChooser((s) => s.open);
  const ids = new Set(favorites.data?.vehicles.map((v) => v.id) ?? []);
  const hasGroups = (favorites.data?.groups.length ?? 0) > 0;
  return {
    isFavorite: (vehicleId: string) => ids.has(vehicleId),
    toggle: (vehicleId: string) => {
      if (!session) {
        router.push("/(auth)/sign-in");
        return;
      }
      if (ids.has(vehicleId)) remove.mutate(vehicleId);
      else if (hasGroups) open(vehicleId);
      else save.mutate({ vehicleId });
    },
    move: (vehicleId: string) => open(vehicleId),
  };
}
