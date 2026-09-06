import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Check, MapPin, Phone } from "lucide-react-native";
import type { Booking, BookingStatus } from "@lv/contracts";

import { Badge, Button, Card, EmptyState, Screen, Text } from "@/components/ui";
import {
  BOOKING_STATUS,
  EVENT_LABEL,
  formatDate,
  formatDateTime,
  formatRemaining,
} from "@/features/client/booking-labels";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { useBooking, useBookingAction } from "@/lib/queries-bookings";
import { theme } from "@/theme";

const STEPS: BookingStatus[] = ["requested", "confirmed", "active", "completed"];

/** Suivi de location cote client (ADR-0009) : compte a rebours, frise, contact revele apres confirmation. */
export default function BookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const booking = useBooking(bookingId);
  const act = useBookingAction(bookingId);

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
        <EmptyState
          title="Réservation introuvable"
          action={<Button label="Retour" variant="ghost" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }
  const b = booking.data;
  const s = BOOKING_STATUS[b.status];
  const cancel = () =>
    Alert.alert(
      "Annuler cette réservation ?",
      b.status === "confirmed" ? "Le loueur sera prévenu." : "Votre demande sera retirée.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Annuler la réservation",
          style: "destructive",
          onPress: () =>
            act.mutate(
              { action: "cancel" },
              {
                onError: (e) =>
                  Alert.alert(
                    "Impossible",
                    e instanceof ApiRequestError ? e.message : "Réessayez.",
                  ),
              },
            ),
        },
      ],
    );

  return (
    <Screen
      eyebrow={s.label}
      title={`${b.vehicle.brand} ${b.vehicle.model}`}
      back
      headerRight={
        <Badge label={b.reference} tone={b.status === "active" ? "success" : "neutral"} />
      }
    >
      <Countdown booking={b} />
      <Card style={styles.timeline}>
        {STEPS.map((step, i) => {
          const event = b.events.find((e) => e.toStatus === step);
          const terminal = b.events.find((e) => !STEPS.includes(e.toStatus));
          const reached = !!event;
          const current =
            !reached &&
            !terminal &&
            STEPS[i - 1] !== undefined &&
            !!b.events.find((e) => e.toStatus === STEPS[i - 1]);
          return (
            <View key={step} style={styles.step}>
              <View style={styles.stepLeft}>
                <View
                  style={[styles.dot, reached ? styles.dotDone : current ? styles.dotNow : null]}
                >
                  {reached ? (
                    <Check size={13} color="#ffffff" strokeWidth={3} />
                  ) : current ? (
                    <View style={styles.dotInner} />
                  ) : null}
                </View>
                {i < STEPS.length - 1 ? (
                  <View style={[styles.link, reached ? styles.linkDone : null]} />
                ) : null}
              </View>
              <View style={styles.stepTexts}>
                <Text variant="smStrong" tone={reached || current ? "default" : "dim"}>
                  {step === "requested"
                    ? "Demande envoyée"
                    : step === "confirmed"
                      ? `Confirmée par ${b.loueurName}`
                      : step === "active"
                        ? "Véhicule retiré"
                        : "Retour à l'agence"}
                </Text>
                <Text variant="small" tone="muted">
                  {event
                    ? formatDateTime(event.createdAt)
                    : step === "active"
                      ? `Prévu ${formatDateTime(b.from)}`
                      : step === "completed"
                        ? `Prévu ${formatDateTime(b.to)}`
                        : ""}
                </Text>
              </View>
            </View>
          );
        })}
        {b.events
          .filter((e) => !STEPS.includes(e.toStatus))
          .map((e) => (
            <View key={e.id} style={styles.step}>
              <View style={styles.stepLeft}>
                <View style={[styles.dot, styles.dotEnd]} />
              </View>
              <View style={styles.stepTexts}>
                <Text variant="smStrong">{EVENT_LABEL[e.toStatus]}</Text>
                <Text variant="small" tone="muted">
                  {formatDateTime(e.createdAt)}
                  {e.reason ? ` · ${e.reason}` : ""}
                </Text>
              </View>
            </View>
          ))}
      </Card>

      {b.contact ? (
        <Card style={styles.contact}>
          <Text variant="bodyStrong">{b.contact.agencyName}</Text>
          <Text variant="sm" tone="muted">
            {[
              b.contact.addressLine,
              [b.contact.postalCode, b.contact.cityName].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ")}
          </Text>
          <View style={styles.actions}>
            {b.contact.phone ? (
              <Button
                label="Appeler"
                variant="ghost"
                size="sm"
                icon={<Phone size={16} color={theme.colors.text} strokeWidth={2} />}
                style={styles.flex}
                onPress={() => void Linking.openURL(`tel:${b.contact!.phone!.replace(/\s/g, "")}`)}
              />
            ) : null}
            {b.contact.latitude !== null && b.contact.longitude !== null ? (
              <Button
                label="Itinéraire"
                variant="ghost"
                size="sm"
                icon={<MapPin size={16} color={theme.colors.text} strokeWidth={2} />}
                style={styles.flex}
                onPress={() =>
                  void Linking.openURL(
                    `https://maps.apple.com/?daddr=${b.contact!.latitude},${b.contact!.longitude}`,
                  )
                }
              />
            ) : null}
          </View>
        </Card>
      ) : (
        <Text variant="small" tone="muted">
          Les coordonnées de l'agence vous seront communiquées dès que le loueur aura confirmé.
        </Text>
      )}

      <Card padded={false}>
        <View style={styles.row}>
          {b.vehicle.photoUrl ? (
            <Image source={{ uri: b.vehicle.photoUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Car size={20} color={theme.colors.textDim} />
            </View>
          )}
          <View style={styles.rowTexts}>
            <Text variant="smStrong">
              {formatDate(b.from)} → {formatDate(b.to)} · {b.days} jour{b.days > 1 ? "s" : ""}
            </Text>
            <Text variant="small" tone="muted">
              {formatEuros(b.total.cents)} à régler à l'agence · caution{" "}
              {formatEuros(b.deposit.cents)}
            </Text>
          </View>
        </View>
      </Card>
      {b.status === "requested" || b.status === "confirmed" ? (
        <Button
          label="Annuler la réservation"
          variant="danger"
          loading={act.isPending}
          onPress={cancel}
        />
      ) : null}
    </Screen>
  );
}

function Countdown({ booking: b }: { booking: Booking }) {
  const target =
    b.status === "active"
      ? b.to
      : b.status === "confirmed"
        ? b.from
        : b.status === "requested" && b.expiresAt
          ? b.expiresAt
          : null;
  const label =
    b.status === "active"
      ? "avant le retour"
      : b.status === "confirmed"
        ? "avant le retrait"
        : "pour la réponse du loueur";
  const remaining = target ? formatRemaining(target) : null;
  const progress =
    b.status === "active"
      ? Math.min(
          1,
          Math.max(
            0,
            (Date.now() - new Date(b.from).getTime()) /
              (new Date(b.to).getTime() - new Date(b.from).getTime()),
          ),
        )
      : null;
  if (!target) return null;
  return (
    <Card style={styles.countdown}>
      <Text variant="small" tone="muted">
        {b.status === "active"
          ? `Retour prévu ${formatDateTime(b.to)}`
          : b.status === "confirmed"
            ? `Retrait ${formatDateTime(b.from)}`
            : "Réponse attendue"}
      </Text>
      <Text variant="display">
        {remaining ?? "Maintenant"}{" "}
        {remaining ? (
          <Text variant="sm" tone="muted">
            {label}
          </Text>
        ) : null}
      </Text>
      {progress !== null ? (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  countdown: { gap: theme.space["1"], backgroundColor: theme.colors.surfaceRaised },
  bar: {
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceHigh,
    overflow: "hidden",
    marginTop: theme.space["2"],
  },
  barFill: { height: "100%", backgroundColor: theme.colors.accent },
  timeline: { gap: 0 },
  step: { flexDirection: "row", gap: theme.space["3"], minHeight: 52 },
  stepLeft: { width: 22, alignItems: "center" },
  dot: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.surfaceHigh,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  dotNow: { borderColor: theme.colors.accent },
  dotEnd: { borderColor: theme.colors.textDim, backgroundColor: theme.colors.textDim },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
  },
  link: { flex: 1, width: 2, backgroundColor: theme.colors.surfaceHigh, marginVertical: 2 },
  linkDone: { backgroundColor: theme.colors.accent },
  stepTexts: { flex: 1, gap: 2, paddingBottom: theme.space["2"] },
  contact: { gap: theme.space["2"] },
  actions: { flexDirection: "row", gap: theme.space["2"], marginTop: theme.space["1"] },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["3"],
  },
  rowTexts: { flex: 1, gap: 2 },
  thumb: { width: 72, height: 56, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
});
