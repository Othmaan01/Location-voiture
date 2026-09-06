import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Clock } from "lucide-react-native";
import type { Booking } from "@lv/contracts";

import { Badge, Card, EmptyState, Screen, Text } from "@/components/ui";
import { BOOKING_STATUS, formatDate, formatRemaining } from "@/features/client/booking-labels";
import { formatEuros } from "@/features/pro/labels";
import { useOrgBookings } from "@/lib/queries-bookings";
import { theme } from "@/theme";

type Tab = "requested" | "upcoming" | "past";

/** Boite de reception du loueur : demandes a traiter, reservations a venir, historique. */
export default function OrgBookingsScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("requested");
  const bookings = useOrgBookings(
    organizationId,
    tab === "past" ? "past" : "upcoming",
    tab === "requested" ? "requested" : undefined,
  );
  const items = (bookings.data?.bookings ?? []).filter((b) =>
    tab === "upcoming" ? b.status !== "requested" : true,
  );

  return (
    <Screen title="Réservations" back>
      <View style={styles.tabs}>
        {(["requested", "upcoming", "past"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.chip, tab === t ? styles.chipOn : null]}
          >
            <Text variant="smStrong" tone={tab === t ? "inverse" : "default"}>
              {t === "requested" ? "Demandes" : t === "upcoming" ? "À venir" : "Passées"}
            </Text>
          </Pressable>
        ))}
      </View>
      {bookings.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {bookings.data && items.length === 0 ? (
        <EmptyState
          title={
            tab === "requested"
              ? "Aucune demande en attente"
              : tab === "upcoming"
                ? "Aucune réservation à venir"
                : "Aucune réservation passée"
          }
          description={
            tab === "requested" ? "Vous serez notifié à chaque nouvelle demande." : undefined
          }
        />
      ) : null}
      {items.map((b) => (
        <Row
          key={b.id}
          booking={b}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/bookings/${b.id}`)}
        />
      ))}
    </Screen>
  );
}

function Row({ booking: b, onPress }: { booking: Booking; onPress: () => void }) {
  const s = BOOKING_STATUS[b.status];
  const delay = b.status === "requested" && b.expiresAt ? formatRemaining(b.expiresAt) : null;
  const name = [b.customer?.firstName, b.customer?.lastName].filter(Boolean).join(" ") || "Client";
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card padded={false} style={b.status === "requested" ? styles.pending : undefined}>
        <View style={styles.row}>
          {b.vehicle.photoUrl ? (
            <Image source={{ uri: b.vehicle.photoUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Car size={18} color={theme.colors.textDim} />
            </View>
          )}
          <View style={styles.rowTexts}>
            <Text variant="bodyStrong">
              {b.vehicle.brand} {b.vehicle.model}
            </Text>
            <Text variant="small" tone="muted">
              {formatDate(b.from)} → {formatDate(b.to)} · {b.days} j · {name}
            </Text>
            {delay ? (
              <View style={styles.delay}>
                <Clock size={12} color={theme.colors.accentTint} strokeWidth={2.5} />
                <Text variant="small" tone="accent">
                  Répondre dans {delay}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text variant="bodyStrong">{formatEuros(b.total.cents)}</Text>
            <Badge label={s.pro} tone={s.tone} />
          </View>
        </View>
      </Card>
    </Pressable>
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
  pending: { borderColor: theme.colors.accentDark },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["3"],
  },
  rowTexts: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  delay: { flexDirection: "row", alignItems: "center", gap: 4 },
  thumb: { width: 56, height: 44, borderRadius: 8, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
});
