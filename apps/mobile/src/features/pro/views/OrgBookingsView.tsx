import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Clock } from "lucide-react-native";
import type { Booking } from "@lv/contracts";

import { Badge, Button, Card, EmptyState, Screen, Text } from "@/components/ui";
import { ConversationList } from "@/features/messaging/ConversationList";
import { BOOKING_STATUS, formatDate, formatRemaining } from "@/features/client/booking-labels";
import { formatEuros } from "@/features/pro/labels";
import { useOrgBookings } from "@/lib/queries-bookings";
import { useOrgConversations, useUnread } from "@/lib/queries-messaging";
import { theme } from "@/theme";

type Tab = "requested" | "upcoming" | "past";
type Section = "bookings" | "messages";

/** Boite de reception du loueur : demandes a traiter, reservations a venir, historique. */
export function OrgBookingsView({
  organizationId,
  embedded = false,
  initialSection = "bookings",
  initialTab,
}: {
  organizationId: string;
  embedded?: boolean;
  /** Ouverture depuis le tableau de bord : section et sous-onglet demandes. */
  initialSection?: Section;
  initialTab?: Tab;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(initialSection);
  const [tab, setTab] = useState<Tab>(initialTab ?? "requested");
  useEffect(() => {
    setSection(initialSection);
    if (initialTab) setTab(initialTab);
  }, [initialSection, initialTab]);
  const [showOlder, setShowOlder] = useState(false);
  const conversations = useOrgConversations(organizationId);
  const unread = useUnread();
  const unreadCount = unread.data?.organizations[organizationId] ?? 0;
  const bookings = useOrgBookings(
    organizationId,
    tab === "past" ? "past" : "upcoming",
    tab === "requested" ? "requested" : undefined,
  );
  const cutoff = Date.now() - 30 * 86_400_000;
  const all = (bookings.data?.bookings ?? []).filter((b) =>
    tab === "upcoming" ? b.status !== "requested" : true,
  );
  // Passees : 30 jours par defaut (ADR-0017), l'historique complet sur demande.
  const items =
    tab === "past" && !showOlder ? all.filter((b) => new Date(b.to).getTime() >= cutoff) : all;
  const hiddenOlder = tab === "past" && !showOlder ? all.length - items.length : 0;

  return (
    <Screen
      title={section === "bookings" ? "Réservations" : "Messages"}
      {...(embedded ? { dock: true } : { back: true })}
      headerRight={
        embedded ? (
          <View style={styles.segment}>
            {(
              [
                { key: "bookings", label: "Demandes" },
                { key: "messages", label: "Messages" },
              ] as const
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === key }}
                onPress={() => setSection(key)}
                style={[styles.segmentItem, section === key ? styles.segmentOn : null]}
              >
                <Text variant="smStrong" tone={section === key ? "inverse" : "muted"}>
                  {label}
                </Text>
                {key === "messages" && unreadCount > 0 && section !== "messages" ? (
                  <View style={styles.segmentDot} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : undefined
      }
    >
      {section === "messages" ? (
        <ConversationList
          conversations={conversations.data?.conversations ?? []}
          side="organization"
          pending={conversations.isPending}
          emptyDescription="Les questions des clients et les échanges liés aux réservations apparaîtront ici."
        />
      ) : null}
      <View style={[styles.tabs, section === "messages" ? styles.hidden : null]}>
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
      {section === "bookings" && bookings.isPending ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : null}
      {section === "bookings" && bookings.data && items.length === 0 ? (
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
      {(section === "bookings" ? items : []).map((b) => (
        <Row
          key={b.id}
          booking={b}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/bookings/${b.id}`)}
        />
      ))}
      {section === "bookings" && hiddenOlder > 0 ? (
        <Button
          label={`Voir plus ancien (${hiddenOlder})`}
          variant="ghost"
          onPress={() => setShowOlder(true)}
        />
      ) : null}
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
  hidden: { display: "none" },
  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentItem: {
    paddingHorizontal: theme.space["3"],
    minHeight: 34,
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  segmentOn: { backgroundColor: theme.colors.text },
  segmentDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
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
