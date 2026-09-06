import type { BookingStatus } from "@lv/contracts";

export type ActorKind = "customer" | "organization_member" | "platform" | "system";

/**
 * Machine a etats de la reservation (ADR-0005). Toute transition absente d'ici est refusee.
 * requested -> confirmed | declined | expired | cancelled
 * confirmed -> active | cancelled | no_show
 * active    -> completed | disputed
 * disputed  -> resolved
 */
const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, ActorKind[]>>> = {
  requested: {
    confirmed: ["organization_member"],
    declined: ["organization_member"],
    expired: ["system"],
    cancelled: ["customer", "platform"],
  },
  confirmed: {
    active: ["organization_member"],
    cancelled: ["customer", "organization_member", "platform"],
    no_show: ["organization_member"],
  },
  active: {
    completed: ["organization_member"],
    disputed: ["customer", "organization_member", "platform"],
  },
  disputed: { resolved: ["platform"] },
  completed: {},
  declined: {},
  expired: {},
  cancelled: {},
  no_show: {},
  resolved: {},
};

export function canTransition(from: BookingStatus, to: BookingStatus, actor: ActorKind): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actor) ?? false;
}

/** Etats "fermes" : le vehicule est bloque sur la periode (contrainte d'exclusion en base). */
export const FIRM_STATUSES: readonly BookingStatus[] = ["confirmed", "active"];
/** Etats terminaux : plus aucune transition possible. */
export const TERMINAL_STATUSES: readonly BookingStatus[] = [
  "completed",
  "declined",
  "expired",
  "cancelled",
  "no_show",
  "resolved",
];
