import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, ChevronRight } from "lucide-react-native";
import type { Booking } from "@lv/contracts";

import { Badge, Button, Card, EmptyState, Screen, Text } from "@/components/ui";
import { BOOKING_STATUS, formatDate, formatRemaining } from "@/features/client/booking-labels";
import { useMyBookings } from "@/lib/queries-bookings";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

type Scope = "current" | "upcoming" | "past";
const SCOPE_LABEL: Record<Scope, string> = {
  current: "En cours",
  upcoming: "À venir",
  past: "Passées",
};

export default function RentalsScreen() {
  const { session } = useSession();
  const router = useRouter();
  // Trois vues (retour fondateur, 2026-09-10) : en cours, a venir, passees.
  const [scope, setScope] = useState<Scope>("current");
  const bookings = useMyBookings(scope === "past" ? "past" : "upcoming");
  const [showOlder, setShowOlder] = useState(false);
  const all = bookings.data?.bookings ?? [];
  // Passees : 30 jours par defaut (ADR-0017), l'historique complet sur demande.
  const cutoff = Date.now() - 30 * 86_400_000;
  const items =
    scope === "past"
      ? showOlder
        ? all
        : all.filter((b) => new Date(b.to).getTime() >= cutoff)
      : all.filter((b) => (b.status === "active") === (scope === "current"));
  const hiddenOlder = scope === "past" && !showOlder ? all.length - items.length : 0;
  const active = scope === "current" ? items[0] : undefined;

  return (
    <Screen title="Locations" dock>
      {!session ? (
        <EmptyState
          title="Connectez-vous"
          description="Retrouvez vos demandes et suivez vos locations."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      ) : null}
      {session ? (
        <View style={styles.tabs}>
          {(["current", "upcoming", "past"] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === s }}
              onPress={() => setScope(s)}
              style={[styles.chip, scope === s ? styles.chipOn : null]}
            >
              <Text variant="smStrong" tone={scope === s ? "inverse" : "default"}>
                {SCOPE_LABEL[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {session && bookings.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {active ? (
        <ActiveCard booking={active} onPress={() => router.push(`/reservations/${active.id}`)} />
      ) : null}
      {items
        .filter((b) => b.id !== active?.id)
        .map((b) => (
          <BookingRow key={b.id} booking={b} onPress={() => router.push(`/reservations/${b.id}`)} />
        ))}
      {hiddenOlder > 0 ? (
        <Button
          label={`Voir plus ancien (${hiddenOlder})`}
          variant="ghost"
          onPress={() => setShowOlder(true)}
        />
      ) : null}
      {session && bookings.data && items.length === 0 ? (
        <EmptyState
          title={
            scope === "current"
              ? "Aucune location en cours"
              : scope === "upcoming"
                ? "Aucune location à venir"
                : "Aucune location passée"
          }
          description={
            scope === "current"
              ? "Votre location apparaît ici dès que l'agence vous remet le véhicule."
              : scope === "upcoming"
                ? "Trouvez une agence près de chez vous et envoyez votre première demande."
                : "Vos locations terminées apparaîtront ici."
          }
          action={
            <Button
              label="Voir les agences"
              variant="ghost"
              onPress={() => router.navigate("/(tabs)")}
            />
          }
        />
      ) : null}
    </Screen>
  );
}

function ActiveCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const remaining = formatRemaining(booking.to);
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={styles.active}>
        <View style={styles.activeHead}>
          <Text variant="caps" tone="accent">
            Location en cours
          </Text>
          <Text variant="small" tone="muted">
            {booking.reference}
          </Text>
        </View>
        <View style={styles.row}>
          <Thumb url={booking.vehicle.photoUrl} />
          <View style={styles.rowTexts}>
            <Text variant="bodyStrong">
              {booking.vehicle.brand} {booking.vehicle.model}
            </Text>
            <Text variant="small" tone="muted">
              {booking.loueurName} · retour {formatDate(booking.to)}
            </Text>
          </View>
        </View>
        <View style={styles.activeFoot}>
          <Text variant="h1">
            {remaining ?? "Retour dépassé"}{" "}
            {remaining ? (
              <Text variant="sm" tone="muted">
                restantes
              </Text>
            ) : null}
          </Text>
          <View style={styles.cta}>
            <Text variant="smStrong" tone="accent">
              Suivre
            </Text>
            <ChevronRight size={16} color={theme.colors.accentTint} strokeWidth={2.5} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function BookingRow({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const s = BOOKING_STATUS[booking.status];
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card padded={false}>
        <View style={[styles.row, styles.rowPad]}>
          <Thumb url={booking.vehicle.photoUrl} />
          <View style={styles.rowTexts}>
            <Text variant="bodyStrong">
              {booking.vehicle.brand} {booking.vehicle.model}
            </Text>
            <Text variant="small" tone="muted">
              {booking.loueurName} · {formatDate(booking.from)} → {formatDate(booking.to)}
            </Text>
          </View>
          <Badge label={s.label} tone={s.tone} />
        </View>
      </Card>
    </Pressable>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? (
    <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty]}>
      <Car size={20} color={theme.colors.textDim} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: theme.space["2"] },
  chip: {
    height: 36,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  active: { borderColor: theme.colors.accentDark, gap: theme.space["3"] },
  activeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cta: { flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  rowPad: { padding: theme.space["3"] },
  rowTexts: { flex: 1, gap: 2 },
  thumb: { width: 72, height: 56, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
});
