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

/** « 14 → 27 sept. » dans le meme mois, sinon « 29 sept. → 5 oct. » : court, lisible dans une puce. */
export function formatPeriod(from: string | null, to: string | null): string {
  if (!from || !to) return "Dates";
  const a = new Date(from);
  const b = new Date(to);
  const f = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return `${a.getDate()} → ${f.format(b)}`;
  return `${f.format(a)} → ${f.format(b)}`;
}
