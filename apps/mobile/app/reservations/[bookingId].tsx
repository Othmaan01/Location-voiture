import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Check, MapPin, MessageCircle, Phone, Star } from "lucide-react-native";
import type { Booking, BookingStatus } from "@lv/contracts";

import {
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Input,
  Screen,
  Sheet,
  Text,
} from "@/components/ui";
import { InspectionsCard } from "@/features/inspections/InspectionsCard";
import { useInspections } from "@/lib/queries-inspections";
import { ContactSheet } from "@/features/messaging/ContactSheet";
import { useMe } from "@/lib/queries";
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
import { useCreateReview } from "@/lib/queries-reviews";
import { theme } from "@/theme";

const STATUS_STEPS: BookingStatus[] = ["requested", "confirmed", "active", "completed"];
/** Cinq etapes lisibles (retour fondateur) : envoyee, en attente, confirmee, vehicule recupere, vehicule rendu. */
type StepKey = "sent" | "waiting" | "confirmed" | "pickedUp" | "returned";
const STEP_KEYS: StepKey[] = ["sent", "waiting", "confirmed", "pickedUp", "returned"];

/** Suivi de location cote client (ADR-0009) : compte a rebours, frise, contact revele apres confirmation. */
export default function BookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const booking = useBooking(bookingId);
  const act = useBookingAction(bookingId);
  const review = useCreateReview(bookingId);
  const me = useMe();
  const [contactOpen, setContactOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const inspections = useInspections(bookingId);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

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
  const hasDeparture = !!inspections.data?.inspections.some((i) => i.kind === "departure");
  const hasReturn = !!inspections.data?.inspections.some((i) => i.kind === "return");
  const s = BOOKING_STATUS[b.status];
  const cancel = () =>
    act.mutate(
      { action: "cancel" },
      {
        onSuccess: () => setCancelOpen(false),
        onError: (e) => {
          setCancelOpen(false);
          Alert.alert("Impossible", e instanceof ApiRequestError ? e.message : "Réessayez.");
        },
      },
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
        {STEP_KEYS.map((key, i) => {
          const st = stepState(key, b, hasDeparture, hasReturn);
          return (
            <View key={key} style={styles.step}>
              <View style={styles.stepLeft}>
                <View
                  style={[
                    styles.dot,
                    st.state === "done"
                      ? styles.dotDone
                      : st.state === "now"
                        ? styles.dotNow
                        : null,
                  ]}
                >
                  {st.state === "done" ? (
                    <Check size={13} color="#ffffff" strokeWidth={3} />
                  ) : st.state === "now" ? (
                    <View style={styles.dotInner} />
                  ) : null}
                </View>
                {i < STEP_KEYS.length - 1 ? (
                  <View style={[styles.link, st.state === "done" ? styles.linkDone : null]} />
                ) : null}
              </View>
              <View style={styles.stepTexts}>
                <Text variant="smStrong" tone={st.state === "todo" ? "dim" : "default"}>
                  {st.title}
                </Text>
                {st.subtitle ? (
                  <Text variant="small" tone="muted">
                    {st.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
        {b.events
          .filter((e) => !STATUS_STEPS.includes(e.toStatus))
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

      <Card style={styles.when}>
        <View style={styles.whenCol}>
          <Text variant="caps" tone="muted">
            Retrait
          </Text>
          <Text variant="h1">{timeFmt.format(new Date(b.from))}</Text>
          <Text variant="sm" tone="muted">
            {capDay(b.from)}
          </Text>
        </View>
        <View style={styles.whenDivider} />
        <View style={styles.whenCol}>
          <Text variant="caps" tone="muted">
            Retour
          </Text>
          <Text variant="h1">{timeFmt.format(new Date(b.to))}</Text>
          <Text variant="sm" tone="muted">
            {capDay(b.to)}
          </Text>
        </View>
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
      <Button
        label="Écrire au loueur"
        variant="ghost"
        icon={<MessageCircle size={18} color={theme.colors.text} strokeWidth={2} />}
        onPress={() => setContactOpen(true)}
      />
      {b.canReview ? (
        <Card style={styles.review}>
          <Text variant="bodyStrong">Comment s'est passée votre location ?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`}
                accessibilityState={{ selected: rating === n }}
                onPress={() => setRating(n)}
                hitSlop={6}
              >
                <Star
                  size={30}
                  color={theme.colors.accentTint}
                  fill={n <= rating ? theme.colors.accentTint : "transparent"}
                />
              </Pressable>
            ))}
          </View>
          <Input
            label="Commentaire (optionnel)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholder="État du véhicule, accueil, ponctualité…"
          />
          <Button
            label="Publier mon avis"
            disabled={rating === 0}
            loading={review.isPending}
            onPress={() =>
              review.mutate(
                { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) },
                {
                  onError: (e) =>
                    Alert.alert(
                      "Avis non publié",
                      e instanceof ApiRequestError ? e.message : "Réessayez.",
                    ),
                },
              )
            }
          />
          <Text variant="small" tone="dim">
            Votre prénom et l'initiale de votre nom apparaîtront avec votre avis.
          </Text>
        </Card>
      ) : null}
      {b.review ? (
        <Card style={styles.review}>
          <Text variant="bodyStrong">Votre avis</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={20}
                color={theme.colors.accentTint}
                fill={n <= b.review!.rating ? theme.colors.accentTint : "transparent"}
              />
            ))}
          </View>
          {b.review.comment ? (
            <Text variant="sm" tone="muted">
              {b.review.comment}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <InspectionsCard bookingId={b.id} canCreate={false} />
      {b.status === "requested" || b.status === "confirmed" ? (
        <Button
          label="Annuler la réservation"
          variant="danger"
          onPress={() => setCancelOpen(true)}
        />
      ) : null}
      {b.status === "active" ? (
        <Button
          label="Signaler un problème"
          variant="ghost"
          size="sm"
          onPress={() => setDisputeOpen(true)}
        />
      ) : null}
      {b.status === "disputed" && me.data?.platformRole ? (
        <Button
          label="Marquer le litige résolu"
          variant="ghost"
          onPress={() => setDisputeOpen(true)}
        />
      ) : null}
      <Sheet
        visible={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title={b.status === "disputed" ? "Résolution du litige" : "Signaler un problème"}
      >
        <Text variant="sm" tone="muted">
          {b.status === "disputed"
            ? "Votre décision est envoyée au client et au loueur."
            : "Décrivez le problème : le loueur est prévenu et notre équipe peut intervenir."}
        </Text>
        <Input
          label="Motif"
          value={disputeReason}
          onChangeText={setDisputeReason}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <Button
          label={b.status === "disputed" ? "Clore le litige" : "Ouvrir un litige"}
          variant={b.status === "disputed" ? "accent" : "danger"}
          disabled={disputeReason.trim().length < 5}
          loading={act.isPending}
          onPress={() =>
            act.mutate(
              {
                action: b.status === "disputed" ? "resolve" : "dispute",
                reason: disputeReason.trim(),
              },
              {
                onSuccess: () => {
                  setDisputeOpen(false);
                  setDisputeReason("");
                },
                onError: (e) =>
                  Alert.alert(
                    "Impossible",
                    e instanceof ApiRequestError ? e.message : "Réessayez.",
                  ),
              },
            )
          }
        />
      </Sheet>
      <ContactSheet
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        organizationId={b.loueurId}
        organizationName={b.loueurName}
        bookingId={b.id}
      />
      <ConfirmSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={b.status === "confirmed" ? "Annuler cette réservation ?" : "Retirer votre demande ?"}
        message={
          b.status === "confirmed"
            ? "Le loueur sera prévenu immédiatement. Cette action est définitive."
            : "Le loueur ne verra plus votre demande. Vous pourrez en refaire une plus tard."
        }
        confirmLabel={
          b.status === "confirmed" ? "Oui, annuler la réservation" : "Oui, retirer ma demande"
        }
        loading={act.isPending}
        onConfirm={cancel}
      />
    </Screen>
  );
}

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const capDay = (iso: string) => {
  const t = longDay.format(new Date(iso));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function stepState(
  key: StepKey,
  b: Booking,
  hasDeparture: boolean,
  hasReturn: boolean,
): { state: "done" | "now" | "todo"; title: string; subtitle: string } {
  const ev = (status: BookingStatus) => b.events.find((e) => e.toStatus === status);
  const terminal = !!b.events.find((e) => !STATUS_STEPS.includes(e.toStatus));
  const confirmed = !!ev("confirmed");
  const active = !!ev("active");
  const completed = !!ev("completed");
  switch (key) {
    case "sent":
      return { state: "done", title: "Demande envoyée", subtitle: formatDateTime(b.createdAt) };
    case "waiting":
      return confirmed || active || completed
        ? { state: "done", title: "Demande traitée", subtitle: "" }
        : terminal
          ? { state: "todo", title: "Demande en attente", subtitle: "" }
          : {
              state: "now",
              title: "Demande en attente",
              subtitle: `${b.loueurName} vous répond ici`,
            };
    case "confirmed":
      return confirmed
        ? {
            state: "done",
            title: `Confirmée par ${b.loueurName}`,
            subtitle: formatDateTime(ev("confirmed")!.createdAt),
          }
        : { state: "todo", title: "Confirmation du loueur", subtitle: "" };
    case "pickedUp":
      if (active)
        return {
          state: "done",
          title: "Véhicule récupéré",
          subtitle: `Remise validée le ${formatDateTime(b.handedOverAt ?? ev("active")!.createdAt)}${hasDeparture ? " · état des lieux signé" : ""}`,
        };
      return {
        state: confirmed && !terminal ? "now" : "todo",
        title: "Véhicule récupéré",
        subtitle: `Prévu ${formatDateTime(b.from)}`,
      };
    case "returned":
      if (completed && hasReturn)
        return {
          state: "done",
          title: "Véhicule rendu",
          subtitle: `État des lieux de retour signé · ${formatDateTime(ev("completed")!.createdAt)}`,
        };
      if (completed)
        return {
          state: "done",
          title: "Véhicule rendu",
          subtitle: formatDateTime(ev("completed")!.createdAt),
        };
      return {
        state: active ? "now" : "todo",
        title: "Véhicule rendu",
        subtitle: `Prévu ${formatDateTime(b.to)}`,
      };
  }
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
          <Text variant="sm" tone="muted" style={styles.countLabel}>
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
  countLabel: { flex: 1, flexShrink: 1, minWidth: 120 },
  when: { flexDirection: "row", alignItems: "center", gap: theme.space["4"] },
  whenCol: { flex: 1, gap: 2 },
  whenDivider: { width: 1, alignSelf: "stretch", backgroundColor: theme.colors.border },
  review: { gap: theme.space["3"] },
  stars: { flexDirection: "row", gap: theme.space["2"] },
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
