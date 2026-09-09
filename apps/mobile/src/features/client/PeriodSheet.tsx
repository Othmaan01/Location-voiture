import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  CalendarLegend,
  MonthCalendar,
  Sheet,
  Text,
  dayKey,
  markRange,
  type DayState,
} from "@/components/ui";
import { theme } from "@/theme";

import {
  SLOTS,
  formatSlot,
  sameDay,
  slotAllowed,
  slotOf,
  startOfDay,
  withSlot,
  type Slot,
} from "./slots";

interface Props {
  visible: boolean;
  from: string | null;
  to: string | null;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
  /** Intervalles occupes du vehicule : ces jours ne se choisissent pas. */
  unavailable?: { from: string; to: string }[];
}

const DAY_MS = 24 * 3600 * 1000;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Dates et heures de location (retour fondateur, 2026-09-09) : un calendrier en francais,
 * on touche le jour de retrait puis le jour de retour, puis un creneau de 30 minutes pour
 * chacun. Le jour meme est possible ; les creneaux passes disparaissent.
 */
export function PeriodSheet({ visible, from, to, onClose, onApply, unavailable = [] }: Props) {
  const now = new Date();
  const today = startOfDay(now);
  const [startDay, setStartDay] = useState<Date>(from ? startOfDay(new Date(from)) : today);
  const [endDay, setEndDay] = useState<Date | null>(
    to ? startOfDay(new Date(to)) : new Date(today.getTime() + DAY_MS),
  );
  const [startSlot, setStartSlot] = useState<Slot>(
    from ? slotOf(new Date(from)) : { hour: 9, minute: 0 },
  );
  const [endSlot, setEndSlot] = useState<Slot>(to ? slotOf(new Date(to)) : { hour: 9, minute: 0 });
  const [month, setMonth] = useState(new Date(startDay.getFullYear(), startDay.getMonth(), 1));

  const pickDay = (day: Date) => {
    if (day.getTime() < today.getTime()) return;
    // Premier toucher : le retrait. Deuxieme toucher apres le retrait : le retour. Sinon on recommence.
    if (!endDay && day.getTime() > startDay.getTime() && !crossesUnavailable(startDay, day)) {
      setEndDay(day);
      return;
    }
    setStartDay(day);
    setEndDay(null);
    if (sameDay(day, today)) {
      const first = SLOTS.find((slot) => slotAllowed(day, slot, now));
      if (first && !slotAllowed(day, startSlot, now)) setStartSlot(first);
    }
  };

  const startChoices = SLOTS.filter((s) => slotAllowed(startDay, s, now));
  const startAt = withSlot(startDay, startSlot);
  const endChoices = SLOTS.filter((s) => {
    if (!endDay) return false;
    const at = withSlot(endDay, s);
    return at.getTime() > startAt.getTime() + 60 * 60_000;
  });
  const startOk = startChoices.some(
    (s) => s.hour === startSlot.hour && s.minute === startSlot.minute,
  );
  const endOk = endChoices.some((s) => s.hour === endSlot.hour && s.minute === endSlot.minute);
  const ready = !!endDay && startOk && endOk;

  const dayStates = useMemo(() => {
    const m = new Map<string, DayState>();
    for (const u of unavailable) markRange(m, u.from, u.to, "unavailable");
    return m;
  }, [unavailable]);
  const crossesUnavailable = (a: Date, b: Date) => {
    for (let d = new Date(a); d.getTime() <= b.getTime(); d.setDate(d.getDate() + 1))
      if (dayStates.has(dayKey(d))) return true;
    return false;
  };

  const quick = [
    { label: "Aujourd'hui", start: today, days: 1 },
    { label: "Demain", start: new Date(today.getTime() + DAY_MS), days: 1 },
    { label: "Ce week-end", start: nextSaturday(today), days: 2 },
    { label: "Une semaine", start: new Date(today.getTime() + DAY_MS), days: 7 },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Dates et heures">
      <View style={styles.quick}>
        {quick.map((q) => (
          <Pressable
            key={q.label}
            accessibilityRole="button"
            onPress={() => {
              setStartDay(q.start);
              setEndDay(new Date(q.start.getTime() + q.days * DAY_MS));
              setMonth(new Date(q.start.getFullYear(), q.start.getMonth(), 1));
              const first = SLOTS.find((s) => slotAllowed(q.start, s, now));
              if (first) setStartSlot(sameDay(q.start, today) ? first : { hour: 9, minute: 0 });
            }}
            style={styles.chip}
          >
            <Text variant="smStrong">{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        minDay={today}
        startDay={startDay}
        endDay={endDay}
        onPickDay={pickDay}
        dayStates={dayStates}
      />
      {unavailable.length > 0 ? <CalendarLegend states={["unavailable"]} /> : null}

      <SlotRow
        label={`Retrait · ${dayFmt.format(startDay)}`}
        choices={startChoices}
        value={startSlot}
        onChange={setStartSlot}
        empty="Plus de créneau aujourd'hui : choisissez demain."
      />
      <SlotRow
        label={endDay ? `Retour · ${dayFmt.format(endDay)}` : "Retour · touchez le jour de retour"}
        choices={endChoices}
        value={endSlot}
        onChange={setEndSlot}
        empty={endDay ? "Le retour doit être au moins une heure après le retrait." : ""}
      />

      <Button
        label={
          ready
            ? `Valider · ${dayFmt.format(startDay)} ${formatSlot(startSlot)} → ${dayFmt.format(endDay!)} ${formatSlot(endSlot)}`
            : "Choisissez vos dates et vos heures"
        }
        disabled={!ready}
        onPress={() =>
          onApply(
            withSlot(startDay, startSlot).toISOString(),
            withSlot(endDay!, endSlot).toISOString(),
          )
        }
      />
    </Sheet>
  );
}

function SlotRow({
  label,
  choices,
  value,
  onChange,
  empty,
}: {
  label: string;
  choices: Slot[];
  value: Slot;
  onChange: (s: Slot) => void;
  empty: string;
}) {
  return (
    <View style={styles.slotRow}>
      <Text variant="smStrong">{label}</Text>
      {choices.length === 0 ? (
        <Text variant="small" tone="dim">
          {empty}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slots}
        >
          {choices.map((s) => {
            const on = s.hour === value.hour && s.minute === value.minute;
            return (
              <Pressable
                key={formatSlot(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => onChange(s)}
                style={[styles.slot, on ? styles.slotOn : null]}
              >
                <Text variant="smStrong" tone={on ? "inverse" : "default"}>
                  {formatSlot(s)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function nextSaturday(today: Date): Date {
  const delta = (6 - today.getDay() + 7) % 7 || 7;
  return new Date(today.getTime() + delta * DAY_MS);
}

const styles = StyleSheet.create({
  quick: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  chip: {
    height: 34,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: "center",
  },
  cell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  slotRow: { gap: theme.space["2"] },
  slots: { gap: theme.space["2"] },
  slot: {
    height: 36,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: "center",
  },
  slotOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
});
