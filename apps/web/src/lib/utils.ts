import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eurCents = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** Montants en centimes (ADR-0004) : on formate au plus pres, sans decimales inutiles. */
export function formatCents(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return cents % 100 === 0 ? eur.format(cents / 100) : eurCents.format(cents / 100);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export const CATEGORY_LABEL: Record<string, string> = {
  citadine: "Citadine",
  compacte: "Compacte",
  berline: "Berline",
  suv: "SUV",
  break: "Break",
  monospace: "Monospace",
  cabriolet: "Cabriolet",
  coupe: "Coupé",
  utilitaire: "Utilitaire",
  minibus: "Minibus",
  prestige: "Prestige",
  sans_permis: "Sans permis",
};
export const TRANSMISSION_LABEL: Record<string, string> = {
  manuelle: "Manuelle",
  automatique: "Automatique",
};
export const FUEL_LABEL: Record<string, string> = {
  essence: "Essence",
  diesel: "Diesel",
  hybride: "Hybride",
  hybride_rechargeable: "Hybride rechargeable",
  electrique: "Électrique",
  gpl: "GPL",
};
