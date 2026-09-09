import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

/**
 * Calendrier mensuel partage (fiche vehicule, reservation, espace loueur) : une seule logique
 * visuelle. Les jours portent un etat ; la selection est un debut et une fin.
 */
export type DayState = "unavailable" | "requested" | "confirmed" | "active" | "blocked";

export const DAY_STATE_LABEL: Record<DayState, string> = {
  unavailable: "Indisponible",
  requested: "Demande en attente",
  confirmed: "Réservation confirmée",
  active: "En location",
  blocked: "Bloqué",
};

export const DAY_STATE_COLOR: Record<DayState, string> = {
  unavailable: theme.colors.textDim,
  requested: theme.colors.warning,
  confirmed: theme.colors.accent,
  active: theme.colors.success,
  blocked: theme.colors.textDim,
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cle de jour locale, stable : « 2026-09-21 ». */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

/** Ajoute chaque jour couvert par un intervalle [from, to) au dictionnaire d'etats. */
export function markRange(
  states: Map<string, DayState>,
  from: string | Date,
  to: string | Date,
  state: DayState,
  priority: DayState[] = ["active", "confirmed", "requested", "blocked", "unavailable"],
) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  // Un retour a 00:00 pile ne bloque pas ce jour-la.
  if (end.getHours() === 0 && end.getMinutes() === 0) end.setTime(end.getTime() - 1);
  end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    const current = states.get(key);
    if (!current || priority.indexOf(state) < priority.indexOf(current)) states.set(key, state);
  }
}

export function MonthCalendar({
  month,
  onMonthChange,
  minDay,
  startDay,
  endDay,
  onPickDay,
  dayStates,
  disabledStates = ["unavailable", "confirmed", "active", "blocked"],
  compact = false,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  /** Avant ce jour, rien n'est selectionnable (aujourd'hui pour un client). */
  minDay?: Date;
  startDay?: Date | null;
  endDay?: Date | null;
  onPickDay?: (day: Date) => void;
  dayStates?: Map<string, DayState>;
  /** Etats qui empechent la selection. */
  disabledStates?: DayState[];
  compact?: boolean;
}) {
  const days = useMemo(() => monthGrid(month), [month]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const minMonth = minDay ? new Date(minDay.getFullYear(), minDay.getMonth(), 1) : null;
  const inRange = (d: Date) =>
    !!startDay && !!endDay && d.getTime() > startDay.getTime() && d.getTime() < endDay.getTime();

  return (
    <View style={styles.wrap}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          onPress={() => onMonthChange(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
          disabled={!!minMonth && first.getTime() <= minMonth.getTime()}
          style={({ pressed }) => [styles.round, pressed ? styles.pressed : null]}
        >
          <ChevronLeft
            size={18}
            color={
              minMonth && first.getTime() <= minMonth.getTime()
                ? theme.colors.textDim
                : theme.colors.text
            }
          />
        </Pressable>
        <Text variant="bodyStrong">{cap(monthFmt.format(first))}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          onPress={() => onMonthChange(new Date(first.getFullYear(), first.getMonth() + 1, 1))}
          style={({ pressed }) => [styles.round, pressed ? styles.pressed : null]}
        >
          <ChevronRight size={18} color={theme.colors.text} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} variant="small" tone="dim" style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((d, i) => {
          if (!d)
            return (
              <View key={`e${i}`} style={[styles.cell, compact ? styles.cellCompact : null]} />
            );
          const past = !!minDay && d.getTime() < minDay.getTime();
          const state = dayStates?.get(dayKey(d));
          const blocked = !!state && disabledStates.includes(state);
          const isStart = !!startDay && sameDay(d, startDay);
          const isEnd = !!endDay && sameDay(d, endDay);
          const between = inRange(d);
          const selectable = !!onPickDay && !past && !blocked;
          return (
            <Pressable
              key={dayKey(d)}
              accessibilityRole="button"
              accessibilityLabel={`${dayFmt.format(d)}${state ? `, ${DAY_STATE_LABEL[state]}` : ""}`}
              disabled={!selectable}
              onPress={() => onPickDay?.(d)}
              style={[
                styles.cell,
                compact ? styles.cellCompact : null,
                between ? styles.cellBetween : null,
                isStart || isEnd ? styles.cellEdge : null,
                isStart && endDay && !isEnd ? styles.cellStart : null,
                isEnd && startDay && !isStart ? styles.cellEnd : null,
              ]}
            >
              <Text
                variant="smStrong"
                tone={isStart || isEnd ? "inverse" : past || blocked ? "dim" : "default"}
                style={blocked && !isStart && !isEnd ? styles.struck : null}
              >
                {d.getDate()}
              </Text>
              {state && !isStart && !isEnd ? (
                <View style={[styles.dot, { backgroundColor: DAY_STATE_COLOR[state] }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Legende compacte : uniquement les etats presents. */
export function CalendarLegend({ states }: { states: DayState[] }) {
  if (states.length === 0) return null;
  return (
    <View style={styles.legend}>
      {states.map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={[styles.dot, styles.legendDot, { backgroundColor: DAY_STATE_COLOR[s] }]} />
          <Text variant="small" tone="muted">
            {DAY_STATE_LABEL[s]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Grille du mois : 7 colonnes, lundi en premier, cases vides avant le 1er. */
export function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space["2"] },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  cellCompact: { height: 38 },
  cellBetween: { backgroundColor: theme.colors.accentSoft, borderRadius: 0 },
  cellEdge: { backgroundColor: theme.colors.accent },
  cellStart: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  cellEnd: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  struck: { textDecorationLine: "line-through" },
  dot: { position: "absolute", bottom: 5, width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["3"] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { position: "relative", bottom: 0, width: 8, height: 8, borderRadius: 4 },
});
