import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react-native";

import {
  Button,
  CalendarLegend,
  Card,
  EmptyState,
  MonthCalendar,
  Screen,
  Select,
  Sheet,
  Text,
  markRange,
  type DayState,
} from "@/components/ui";
import { PeriodSheet } from "@/features/client/PeriodSheet";
import { ApiRequestError } from "@/lib/api";
import { useBlocks, useCreateBlock, useDeleteBlock, useOrgBookings } from "@/lib/queries-bookings";
import { useVehicles } from "@/lib/queries-catalog";
import { theme } from "@/theme";

const DAY = 86_400_000;
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "narrow" });
const rangeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const REASONS = [
  { value: "maintenance" as const, label: "Entretien / révision" },
  { value: "external_rental" as const, label: "Loué hors application" },
  { value: "other" as const, label: "Autre" },
];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Calendrier hebdomadaire : une ligne par vehicule, reservations fermes et blocages. La vue centrale du pro. */
export function OrgCalendarView({
  organizationId,
  embedded = false,
  initialVehicleId,
}: {
  organizationId: string;
  embedded?: boolean;
  /** Ouvert depuis la fiche d'un vehicule : vue mois sur ce vehicule. */
  initialVehicleId?: string;
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "month">(initialVehicleId ? "month" : "week");
  const [monthVehicle, setMonthVehicle] = useState<string | null>(initialVehicleId ?? null);
  useEffect(() => {
    if (!initialVehicleId) return;
    setMonthVehicle(initialVehicleId);
    setView("month");
  }, [initialVehicleId]);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const vehicles = useVehicles(organizationId);
  const bookings = useOrgBookings(organizationId, "all");
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY)),
    [weekStart],
  );
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY);
  const firm = (bookings.data?.bookings ?? []).filter(
    (b) =>
      (b.status === "confirmed" || b.status === "active" || b.status === "requested") &&
      new Date(b.from) < weekEnd &&
      new Date(b.to) > weekStart,
  );
  const today = new Date().toDateString();

  return (
    <Screen
      title="Calendrier"
      {...(embedded ? { dock: true } : { back: true })}
      headerRight={
        <Button
          label="Bloquer"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          onPress={() => setBlockFor(vehicles.data?.vehicles[0]?.id ?? null)}
          disabled={!vehicles.data || vehicles.data.vehicles.length === 0}
        />
      }
      contentStyle={styles.content}
    >
      <View style={styles.viewToggle}>
        {(
          [
            { key: "week", label: "Semaine" },
            { key: "month", label: "Mois" },
          ] as const
        ).map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === key }}
            onPress={() => setView(key)}
            style={[styles.viewItem, view === key ? styles.viewOn : null]}
          >
            <Text variant="smStrong" tone={view === key ? "inverse" : "muted"}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === "month" ? (
        <MonthView
          organizationId={organizationId}
          vehicles={
            vehicles.data?.vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` })) ??
            []
          }
          vehicleId={monthVehicle ?? vehicles.data?.vehicles[0]?.id ?? null}
          onChangeVehicle={setMonthVehicle}
          month={month}
          onMonthChange={setMonth}
          bookings={bookings.data?.bookings ?? []}
          onBooking={(id) => router.push(`/(pro)/organizations/${organizationId}/bookings/${id}`)}
        />
      ) : null}
      <View style={[styles.nav, view === "month" ? styles.hidden : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Semaine précédente"
          onPress={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))}
          style={styles.navBtn}
        >
          <ChevronLeft size={20} color={theme.colors.textMuted} />
        </Pressable>
        <Text variant="smStrong">
          {rangeFmt.format(weekStart)} → {rangeFmt.format(new Date(weekEnd.getTime() - DAY))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Semaine suivante"
          onPress={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))}
          style={styles.navBtn}
        >
          <ChevronRight size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <View style={[styles.header, view === "month" ? styles.hidden : null]}>
        <View style={styles.label} />
        <View style={styles.grid}>
          {days.map((d) => (
            <View key={d.toISOString()} style={styles.dayHead}>
              <Text variant="small" tone="muted">
                {dayFmt.format(d)}
              </Text>
              <Text variant="smStrong" tone={d.toDateString() === today ? "accent" : "default"}>
                {d.getDate()}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {vehicles.isPending || bookings.isPending ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : null}
      {vehicles.data && vehicles.data.vehicles.length === 0 ? (
        <EmptyState title="Aucun véhicule" />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={view === "month" ? styles.hidden : null}
      >
        {vehicles.data?.vehicles.map((v) => (
          <VehicleRow
            key={v.id}
            vehicleId={v.id}
            name={`${v.brand} ${v.model}`}
            weekStart={weekStart}
            bookings={firm.filter((b) => b.vehicle.id === v.id)}
            onBooking={(id) => router.push(`/(pro)/organizations/${organizationId}/bookings/${id}`)}
          />
        ))}
      </ScrollView>
      <View style={[styles.legend, view === "month" ? styles.hidden : null]}>
        <Legend color={theme.colors.accentSoft} border={theme.colors.accent} label="Demande" />
        <Legend color={theme.colors.text} label="Confirmée" />
        <Legend color={theme.colors.success} label="En location" />
        <Legend color={theme.colors.surfaceHigh} label="Bloqué" />
      </View>
      {blockFor ? (
        <BlockSheet
          vehicleId={blockFor}
          vehicles={
            vehicles.data?.vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` })) ??
            []
          }
          onChangeVehicle={setBlockFor}
          onClose={() => setBlockFor(null)}
        />
      ) : null}
    </Screen>
  );
}

function VehicleRow({
  vehicleId,
  name,
  weekStart,
  bookings,
  onBooking,
}: {
  vehicleId: string;
  name: string;
  weekStart: Date;
  bookings: {
    id: string;
    from: string;
    to: string;
    status: string;
    customer: { firstName: string | null } | null;
  }[];
  onBooking: (id: string) => void;
}) {
  const blocks = useBlocks(vehicleId);
  const remove = useDeleteBlock(vehicleId);
  const weekEnd = weekStart.getTime() + 7 * DAY;
  const span = (from: string, to: string) => {
    const a = Math.max(new Date(from).getTime(), weekStart.getTime());
    const b = Math.min(new Date(to).getTime(), weekEnd);
    return {
      left: ((a - weekStart.getTime()) / (7 * DAY)) * 100,
      width: Math.max(4, ((b - a) / (7 * DAY)) * 100),
    };
  };
  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <Text variant="smStrong" numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={[styles.cell, { left: `${(i / 7) * 100}%` }]} />
        ))}
        {(blocks.data?.blocks ?? [])
          .filter(
            (k) =>
              new Date(k.from).getTime() < weekEnd &&
              new Date(k.to).getTime() > weekStart.getTime(),
          )
          .map((k) => {
            const s = span(k.from, k.to);
            return (
              <Pressable
                key={k.id}
                accessibilityRole="button"
                accessibilityLabel="Blocage"
                onLongPress={() =>
                  Alert.alert("Retirer ce blocage ?", k.note ?? undefined, [
                    { text: "Annuler", style: "cancel" },
                    { text: "Retirer", style: "destructive", onPress: () => remove.mutate(k.id) },
                  ])
                }
                style={[styles.bar, styles.barBlock, { left: `${s.left}%`, width: `${s.width}%` }]}
              >
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {k.note ?? "Bloqué"}
                </Text>
              </Pressable>
            );
          })}
        {bookings.map((b) => {
          const s = span(b.from, b.to);
          const pending = b.status === "requested";
          const active = b.status === "active";
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              onPress={() => onBooking(b.id)}
              style={[
                styles.bar,
                pending ? styles.barPending : active ? styles.barActive : styles.barFirm,
                { left: `${s.left}%`, width: `${s.width}%` },
              ]}
            >
              <Text
                variant="small"
                numberOfLines={1}
                style={pending ? styles.barPendingText : styles.barFirmText}
              >
                {b.customer?.firstName ?? "Client"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Vue mois d'un vehicule : le calendrier partage avec le client, plus les demandes et blocages du loueur. */
function MonthView({
  vehicles,
  vehicleId,
  onChangeVehicle,
  month,
  onMonthChange,
  bookings,
  onBooking,
}: {
  organizationId: string;
  vehicles: { value: string; label: string }[];
  vehicleId: string | null;
  onChangeVehicle: (id: string) => void;
  month: Date;
  onMonthChange: (d: Date) => void;
  bookings: { id: string; from: string; to: string; status: string; vehicle: { id: string } }[];
  onBooking: (id: string) => void;
}) {
  const blocks = useBlocks(vehicleId ?? "");
  const dayStates = useMemo(() => {
    const m = new Map<string, DayState>();
    for (const b of bookings) {
      if (b.vehicle.id !== vehicleId) continue;
      const state: DayState | null =
        b.status === "active"
          ? "active"
          : b.status === "confirmed"
            ? "confirmed"
            : b.status === "requested"
              ? "requested"
              : null;
      if (state) markRange(m, b.from, b.to, state);
    }
    for (const k of blocks.data?.blocks ?? []) markRange(m, k.from, k.to, "blocked");
    return m;
  }, [bookings, blocks.data, vehicleId]);
  const present = (["requested", "confirmed", "active", "blocked"] as DayState[]).filter((st) =>
    [...dayStates.values()].includes(st),
  );
  const onPickDay = (day: Date) => {
    const hit = bookings.find(
      (b) =>
        b.vehicle.id === vehicleId &&
        new Date(b.from).getTime() <= day.getTime() + 86_399_999 &&
        new Date(b.to).getTime() > day.getTime(),
    );
    if (hit) onBooking(hit.id);
  };
  if (!vehicleId) return <EmptyState title="Aucun véhicule" />;
  return (
    <Card style={{ gap: theme.space["3"] }}>
      <Select label="Véhicule" value={vehicleId} options={vehicles} onChange={onChangeVehicle} />
      <MonthCalendar
        month={month}
        onMonthChange={onMonthChange}
        dayStates={dayStates}
        disabledStates={[]}
        onPickDay={onPickDay}
        compact
      />
      <CalendarLegend states={present} />
      <Text variant="small" tone="dim">
        Un jour sans point est disponible. Touchez un jour occupé pour ouvrir la réservation.
      </Text>
    </Card>
  );
}

function BlockSheet({
  vehicleId,
  vehicles,
  onChangeVehicle,
  onClose,
}: {
  vehicleId: string;
  vehicles: { value: string; label: string }[];
  onChangeVehicle: (id: string) => void;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [reason, setReason] = useState<"maintenance" | "external_rental" | "other">("maintenance");
  const [datesOpen, setDatesOpen] = useState(false);
  const create = useCreateBlock(vehicleId);
  return (
    <Sheet visible onClose={onClose} title="Bloquer des dates">
      <Select label="Véhicule" value={vehicleId} options={vehicles} onChange={onChangeVehicle} />
      <Select label="Motif" value={reason} options={REASONS} onChange={setReason} />
      <Button
        label={
          period
            ? `${rangeFmt.format(new Date(period.from))} → ${rangeFmt.format(new Date(period.to))}`
            : "Choisir les dates"
        }
        variant="ghost"
        onPress={() => setDatesOpen(true)}
      />
      <Button
        label="Bloquer"
        disabled={!period}
        loading={create.isPending}
        onPress={() =>
          period &&
          create.mutate(
            { ...period, reason },
            {
              onSuccess: onClose,
              onError: (e) =>
                Alert.alert(
                  "Blocage impossible",
                  e instanceof ApiRequestError ? e.message : "Réessayez.",
                ),
            },
          )
        }
      />
      <PeriodSheet
        visible={datesOpen}
        from={period?.from ?? null}
        to={period?.to ?? null}
        onClose={() => setDatesOpen(false)}
        onApply={(f, t) => {
          setPeriod({ from: f, to: t });
          setDatesOpen(false);
        }}
      />
    </Sheet>
  );
}

function Legend({
  color,
  border,
  label,
}: {
  color: ColorValue;
  border?: ColorValue;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: border ?? color }]} />
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space["3"] },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: {
    width: theme.touch.minTarget,
    height: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
  },
  label: { width: 96, paddingRight: theme.space["2"], justifyContent: "center" },
  grid: { flex: 1, flexDirection: "row" },
  dayHead: { flex: 1, alignItems: "center" },
  row: {
    flexDirection: "row",
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  track: { flex: 1, position: "relative", height: 52 },
  cell: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  bar: {
    position: "absolute",
    top: 10,
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
    overflow: "hidden",
  },
  barFirm: { backgroundColor: theme.colors.text },
  barFirmText: { color: theme.colors.textInverse, fontWeight: theme.font.weight.bold },
  barPending: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.accent,
  },
  barPendingText: { color: theme.colors.accentTint, fontWeight: theme.font.weight.bold },
  barBlock: { backgroundColor: theme.colors.surfaceHigh },
  barActive: { backgroundColor: theme.colors.success },
  viewToggle: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: "flex-start",
  },
  viewItem: {
    paddingHorizontal: theme.space["3"],
    minHeight: 32,
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  viewOn: { backgroundColor: theme.colors.text },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["3"] },
  hidden: { display: "none" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 4, borderWidth: 1.5 },
});
