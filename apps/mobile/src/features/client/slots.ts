/**
 * Creneaux de retrait et de retour (retour fondateur, 2026-09-09) : toutes les 30 minutes,
 * de 7 h a 21 h. Le jour meme, seuls les creneaux encore atteignables sont proposes
 * (30 minutes de marge, la meme regle que le moteur).
 */
export const SLOT_MINUTES = 30;
export const FIRST_SLOT_HOUR = 7;
export const LAST_SLOT_HOUR = 21;
export const LEAD_MINUTES = 30;
const DAY_MS = 24 * 3600 * 1000;

export interface Slot {
  hour: number;
  minute: number;
}

export const SLOTS: Slot[] = Array.from(
  { length: (LAST_SLOT_HOUR - FIRST_SLOT_HOUR) * (60 / SLOT_MINUTES) + 1 },
  (_, i) => ({
    hour: FIRST_SLOT_HOUR + Math.floor((i * SLOT_MINUTES) / 60),
    minute: (i * SLOT_MINUTES) % 60,
  }),
);

export const formatSlot = (s: Slot) =>
  `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const withSlot = (day: Date, s: Slot) => {
  const x = new Date(day);
  x.setHours(s.hour, s.minute, 0, 0);
  return x;
};

/** Le creneau est-il encore possible ce jour-la ? Le jour meme, il doit rester 30 minutes de marge. */
export function slotAllowed(day: Date, s: Slot, now = new Date()): boolean {
  const at = withSlot(day, s);
  return at.getTime() >= now.getTime() + LEAD_MINUTES * 60_000;
}

/** Premier creneau possible aujourd'hui, sinon 9 h demain. */
export function nextSlot(now = new Date()): Date {
  const today = startOfDay(now);
  const s = SLOTS.find((slot) => slotAllowed(today, slot, now));
  if (s) return withSlot(today, s);
  return withSlot(new Date(today.getTime() + DAY_MS), { hour: 9, minute: 0 });
}

/** Periode par defaut : prochain creneau, pour une journee. */
export function defaultPeriod(now = new Date()): { from: string; to: string } {
  const from = nextSlot(now);
  return { from: from.toISOString(), to: new Date(from.getTime() + DAY_MS).toISOString() };
}

export const slotOf = (d: Date): Slot => ({
  hour: d.getHours(),
  minute: d.getMinutes() - (d.getMinutes() % SLOT_MINUTES),
});
