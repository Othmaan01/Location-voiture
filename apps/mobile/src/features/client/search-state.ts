import { defaultPeriod as nextDefaultPeriod } from "./slots";
import { create } from "zustand";

/**
 * Etat de recherche transverse (lieu + dates) : saisi tot, conserve entre les ecrans,
 * pour que chaque prix affiche soit un prix pour CES dates (brief UX).
 */
interface SearchState {
  citySlug: string | null;
  cityName: string | null;
  origin: { lat: number; lng: number } | null;
  from: string | null;
  to: string | null;
  setCity: (slug: string | null, name: string | null) => void;
  setOrigin: (origin: { lat: number; lng: number } | null) => void;
  setPeriod: (from: string | null, to: string | null) => void;
}

export const useSearchState = create<SearchState>((set) => ({
  citySlug: null,
  cityName: null,
  origin: null,
  from: null,
  to: null,
  setCity: (citySlug, cityName) => set({ citySlug, cityName }),
  setOrigin: (origin) => set({ origin }),
  setPeriod: (from, to) => set({ from, to }),
}));

/** Periode par defaut : demain 9h -> surlendemain 9h, dans le fuseau du telephone. */
export function defaultPeriod(): { from: string; to: string } {
  return nextDefaultPeriod();
}

export function formatPeriod(from: string | null, to: string | null): string {
  if (!from || !to) return "Dates";
  const f = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${f.format(new Date(from))} → ${f.format(new Date(to))}`;
}
