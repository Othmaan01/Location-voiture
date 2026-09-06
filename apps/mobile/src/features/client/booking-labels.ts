import type { BookingStatus } from "@lv/contracts";

export const BOOKING_STATUS: Record<
  BookingStatus,
  {
    label: string;
    tone: "accent" | "success" | "warning" | "neutral";
    customer: string;
    pro: string;
  }
> = {
  requested: {
    label: "En attente",
    tone: "warning",
    customer: "Le loueur a 24 h pour répondre.",
    pro: "À traiter",
  },
  confirmed: {
    label: "Confirmée",
    tone: "success",
    customer: "Rendez-vous à l'agence au retrait.",
    pro: "Confirmée",
  },
  active: { label: "En cours", tone: "accent", customer: "Bonne route.", pro: "Véhicule sorti" },
  completed: { label: "Terminée", tone: "neutral", customer: "Merci, à bientôt.", pro: "Terminée" },
  declined: {
    label: "Refusée",
    tone: "neutral",
    customer: "Le loueur n'a pas pu accepter.",
    pro: "Refusée",
  },
  expired: {
    label: "Expirée",
    tone: "neutral",
    customer: "Sans réponse du loueur dans le délai.",
    pro: "Expirée",
  },
  cancelled: {
    label: "Annulée",
    tone: "neutral",
    customer: "Réservation annulée.",
    pro: "Annulée",
  },
  no_show: {
    label: "Non présenté",
    tone: "neutral",
    customer: "Vous ne vous êtes pas présenté.",
    pro: "Client absent",
  },
  disputed: { label: "Litige", tone: "accent", customer: "Un litige est ouvert.", pro: "Litige" },
  resolved: { label: "Résolue", tone: "neutral", customer: "Litige résolu.", pro: "Litige résolu" },
};

export const EVENT_LABEL: Record<BookingStatus, string> = {
  requested: "Demande envoyée",
  confirmed: "Confirmée par le loueur",
  active: "Véhicule retiré",
  completed: "Véhicule rendu",
  declined: "Refusée par le loueur",
  expired: "Expirée sans réponse",
  cancelled: "Annulée",
  no_show: "Client non présenté",
  disputed: "Litige ouvert",
  resolved: "Litige résolu",
};

const dt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const d = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
export const formatDateTime = (iso: string) => dt.format(new Date(iso));
export const formatDate = (iso: string) => d.format(new Date(iso));

/** "1 j 14 h" restantes/avant ; null si depasse. */
export function formatRemaining(untilIso: string): string | null {
  const ms = new Date(untilIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days} j ${hours} h`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}
