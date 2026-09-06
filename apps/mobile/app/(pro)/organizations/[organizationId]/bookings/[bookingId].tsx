import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { Phone } from "lucide-react-native";

import { Badge, Button, Card, EmptyState, Input, Screen, Sheet, Text } from "@/components/ui";
import {
  BOOKING_STATUS,
  EVENT_LABEL,
  formatDateTime,
  formatRemaining,
} from "@/features/client/booking-labels";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useBooking, useBookingAction } from "@/lib/queries-bookings";
import { theme } from "@/theme";

/** Detail d'une demande cote loueur : les 5 informations utiles, decision en 2 taps, puis depart/retour. */
export default function OrgBookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = useBooking(bookingId);
  const act = useBookingAction(bookingId);
  const [reasonFor, setReasonFor] = useState<"decline" | "cancel" | null>(null);
  const [reason, setReason] = useState("");

  if (booking.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (booking.isError || !booking.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState title="Réservation introuvable" />
      </Screen>
    );
  }
  const b = booking.data;
  const s = BOOKING_STATUS[b.status];
  const run = (
    action: "confirm" | "decline" | "cancel" | "start" | "complete" | "no-show",
    withReason?: string,
  ) =>
    act.mutate(
      { action, ...(withReason ? { reason: withReason } : {}) },
      {
        onSuccess: () => {
          setReasonFor(null);
          setReason("");
        },
        onError: (e) =>
          Alert.alert("Action impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );
  const name = [b.customer?.firstName, b.customer?.lastName].filter(Boolean).join(" ") || "Client";
  const delay = b.status === "requested" && b.expiresAt ? formatRemaining(b.expiresAt) : null;

  return (
    <Screen
      eyebrow={b.reference}
      title={`${b.vehicle.brand} ${b.vehicle.model}`}
      back
      headerRight={<Badge label={s.pro} tone={s.tone} />}
    >
      {delay ? (
        <Text variant="sm" tone="accent">
          Répondre dans {delay}. Sans réponse, la demande expire.
        </Text>
      ) : null}
      <Card padded={false}>
        <Info
          label="Période"
          value={`${formatDateTime(b.from)} → ${formatDateTime(b.to)} · ${b.days} j`}
        />
        <Info
          label="Prix affiché"
          value={`${formatEuros(b.total.cents)} · caution ${formatEuros(b.deposit.cents)}`}
        />
        <Info
          label="Client"
          value={`${name}${b.customer ? ` · ${b.customer.completedBookings} location${b.customer.completedBookings > 1 ? "s" : ""} terminée${b.customer.completedBookings > 1 ? "s" : ""}` : ""}`}
        />
        <Info label="Téléphone" value={b.customer?.phone ?? "Transmis après confirmation"} />
        <Info label="Message" value={b.customerMessage ? `« ${b.customerMessage} »` : "—"} last />
      </Card>
      {b.customer?.phone ? (
        <Button
          label="Appeler le client"
          variant="ghost"
          icon={<Phone size={18} color={theme.colors.text} strokeWidth={2} />}
          onPress={() => void Linking.openURL(`tel:${b.customer!.phone!.replace(/\s/g, "")}`)}
        />
      ) : null}

      {b.status === "requested" ? (
        <>
          <Text variant="small" tone="dim">
            En acceptant, le véhicule est bloqué sur ces dates et le client reçoit vos coordonnées.
            Le règlement se fait entre vous.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Refuser"
              variant="ghost"
              style={styles.flex}
              onPress={() => setReasonFor("decline")}
            />
            <Button
              label="Accepter la réservation"
              style={styles.flex2}
              loading={act.isPending}
              onPress={() => run("confirm")}
            />
          </View>
        </>
      ) : null}
      {b.status === "confirmed" ? (
        <View style={styles.stack}>
          <Button
            label="Véhicule remis au client"
            loading={act.isPending}
            onPress={() => run("start")}
          />
          <View style={styles.actions}>
            <Button
              label="Client absent"
              variant="ghost"
              style={styles.flex}
              onPress={() => run("no-show")}
            />
            <Button
              label="Annuler"
              variant="danger"
              style={styles.flex}
              onPress={() => setReasonFor("cancel")}
            />
          </View>
        </View>
      ) : null}
      {b.status === "active" ? (
        <Button label="Véhicule rendu" loading={act.isPending} onPress={() => run("complete")} />
      ) : null}

      <Card style={styles.events}>
        <Text variant="caps" tone="muted">
          Historique
        </Text>
        {b.events.map((e) => (
          <View key={e.id} style={styles.event}>
            <Text variant="sm">{EVENT_LABEL[e.toStatus]}</Text>
            <Text variant="small" tone="muted">
              {formatDateTime(e.createdAt)}
              {e.reason ? ` · ${e.reason}` : ""}
            </Text>
          </View>
        ))}
      </Card>

      <Sheet
        visible={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        title={reasonFor === "decline" ? "Motif du refus" : "Motif de l'annulation"}
      >
        <Input
          label="Motif montré au client"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          placeholder={
            reasonFor === "decline"
              ? "Ex. : véhicule déjà réservé par téléphone"
              : "Ex. : véhicule immobilisé"
          }
        />
        <Button
          label={reasonFor === "decline" ? "Confirmer le refus" : "Confirmer l'annulation"}
          variant="danger"
          disabled={reason.trim().length < 2}
          loading={act.isPending}
          onPress={() => run(reasonFor === "decline" ? "decline" : "cancel", reason.trim())}
        />
      </Sheet>
    </Screen>
  );
}

function Info({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.info, last ? null : styles.infoBorder]}>
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text variant="sm" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { paddingHorizontal: theme.space["4"], paddingVertical: theme.space["3"], gap: 2 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoValue: { fontWeight: theme.font.weight.semibold },
  actions: { flexDirection: "row", gap: theme.space["2"] },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  stack: { gap: theme.space["2"] },
  events: { gap: theme.space["2"] },
  event: { gap: 1 },
});
