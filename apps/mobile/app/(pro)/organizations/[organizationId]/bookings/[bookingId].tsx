import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Check, MessageCircle, Phone, Star } from "lucide-react-native";

import {
  Avatar,
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
import {
  BOOKING_STATUS,
  EVENT_LABEL,
  formatDateTime,
  formatRemaining,
} from "@/features/client/booking-labels";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { InspectionsCard } from "@/features/inspections/InspectionsCard";
import { useInspections } from "@/lib/queries-inspections";
import { ReviewCustomerSheet } from "@/features/pro/ReviewCustomerSheet";
import { ContactSheet } from "@/features/messaging/ContactSheet";
import { useBooking, useBookingAction } from "@/lib/queries-bookings";
import { useOrgConversations } from "@/lib/queries-messaging";
import { useLoueurReviews, useReplyReview } from "@/lib/queries-reviews";
import { theme } from "@/theme";

/** Detail d'une demande cote loueur : les 5 informations utiles, decision en 2 taps, puis depart/retour. */
export default function OrgBookingScreen() {
  const { organizationId, bookingId } = useLocalSearchParams<{
    organizationId: string;
    bookingId: string;
  }>();
  const router = useRouter();
  const booking = useBooking(bookingId);
  const act = useBookingAction(bookingId);
  const conversations = useOrgConversations(organizationId);
  const reviews = useLoueurReviews(organizationId, !!booking.data?.review);
  const replyReview = useReplyReview();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [paperFor, setPaperFor] = useState<"start" | "complete" | null>(null);
  const [inspectionChecked, setInspectionChecked] = useState(false);
  const [contractChecked, setContractChecked] = useState(false);
  const [returnChecked, setReturnChecked] = useState(false);
  const inspections = useInspections(bookingId);
  const hasDeparture = !!inspections.data?.inspections.some((i) => i.kind === "departure");
  const hasReturn = !!inspections.data?.inspections.some((i) => i.kind === "return");
  const [reasonFor, setReasonFor] = useState<"decline" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const existingThread = conversations.data?.conversations.find((c) => c.bookingId === bookingId);
  const fullReview = reviews.data?.reviews.find((r) => r.bookingId === bookingId);

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
          if (action === "confirm") celebrate("Réservation confirmée", "Le client est prévenu.");
          if (action === "complete")
            celebrate("Location terminée", "Le client peut laisser un avis.");
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
        <View style={styles.customerRow}>
          <Avatar name={name} uri={b.customer?.avatarUrl ?? null} size={40} round />
          <View style={styles.customerTexts}>
            <Text variant="bodyStrong">{name}</Text>
            <Text variant="small" tone="muted">
              {b.customer
                ? `${b.customer.completedBookings} location${b.customer.completedBookings > 1 ? "s" : ""} terminée${b.customer.completedBookings > 1 ? "s" : ""}${
                    b.customer.ratingAverage !== null
                      ? ` · ${b.customer.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 (${b.customer.ratingCount} avis)`
                      : " · pas encore noté"
                  }`
                : "Client"}
            </Text>
          </View>
        </View>
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

      {b.status === "confirmed" ? (
        <Card style={styles.handover}>
          <Text variant="bodyStrong">Remise du véhicule</Text>
          <Text variant="small" tone="muted">
            Le contrat et le paiement se font hors application. Confirmez les deux étapes pour
            valider la remise : le client est prévenu et la location démarre.
          </Text>
          <CheckRow
            label="État des lieux de départ effectué"
            hint={hasDeparture ? "Signé dans l'application" : "Dans l'application ou sur papier"}
            checked={hasDeparture || inspectionChecked}
            locked={hasDeparture}
            onToggle={() => setInspectionChecked((v) => !v)}
          />
          <CheckRow
            label="Contrat de location signé"
            hint="Signé avec le client, hors application"
            checked={contractChecked}
            onToggle={() => setContractChecked((v) => !v)}
          />
          {!hasDeparture ? (
            <Button
              label="Faire l'état des lieux dans l'application"
              variant="ghost"
              size="sm"
              onPress={() =>
                router.push(
                  `/(pro)/organizations/${organizationId}/bookings/${bookingId}/inspection`,
                )
              }
            />
          ) : null}
          <Button
            label="Valider la remise du véhicule"
            disabled={!(hasDeparture || inspectionChecked) || !contractChecked}
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
        </Card>
      ) : null}
      {b.handedOverAt ? (
        <Text variant="small" tone="muted">
          Remise validée le {formatDateTime(b.handedOverAt)} · état des lieux et contrat confirmés.
        </Text>
      ) : null}
      {b.status === "active" ? (
        <Card style={styles.handover}>
          <Text variant="bodyStrong">Retour du véhicule</Text>
          <Text variant="small" tone="muted">
            D'abord l'état des lieux de retour, puis la confirmation : le client est prévenu et la
            location se termine.
          </Text>
          <CheckRow
            label="1 · État des lieux de retour effectué"
            hint={hasReturn ? "Signé dans l'application" : "Dans l'application ou sur papier"}
            checked={hasReturn || returnChecked}
            locked={hasReturn}
            onToggle={() => setReturnChecked((v) => !v)}
          />
          {!hasReturn ? (
            <Button
              label="Faire l'état des lieux de retour dans l'application"
              variant="ghost"
              size="sm"
              onPress={() =>
                router.push(
                  `/(pro)/organizations/${organizationId}/bookings/${bookingId}/inspection`,
                )
              }
            />
          ) : null}
          <Button
            label="2 · Véhicule rendu"
            disabled={!(hasReturn || returnChecked)}
            loading={act.isPending}
            onPress={() => run("complete")}
          />
        </Card>
      ) : null}

      {b.status === "completed" && b.customer ? (
        b.customer.reviewedByOrganization ? (
          <Text variant="sm" tone="muted">
            Vous avez noté ce client.
          </Text>
        ) : (
          <Button
            label="Noter le client"
            variant="ghost"
            icon={<Star size={18} color={theme.colors.text} />}
            onPress={() => setReviewOpen(true)}
          />
        )
      ) : null}
      <InspectionsCard
        bookingId={b.id}
        organizationId={organizationId}
        canCreate={b.status === "confirmed" || b.status === "active" || b.status === "completed"}
      />

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
      {b.status === "active" ? (
        <Button
          label="Ouvrir un litige"
          variant="ghost"
          size="sm"
          onPress={() => setDisputeOpen(true)}
        />
      ) : null}
      <Sheet visible={disputeOpen} onClose={() => setDisputeOpen(false)} title="Ouvrir un litige">
        <Text variant="sm" tone="muted">
          Le client est prévenu et notre équipe tranche. Décrivez les faits.
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
          label="Ouvrir le litige"
          variant="danger"
          disabled={disputeReason.trim().length < 5}
          loading={act.isPending}
          onPress={() =>
            act.mutate(
              { action: "dispute", reason: disputeReason.trim() },
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
      <Button
        label={existingThread ? "Ouvrir la conversation" : "Écrire au client"}
        variant="ghost"
        icon={<MessageCircle size={18} color={theme.colors.text} strokeWidth={2} />}
        onPress={() =>
          existingThread ? router.push(`/conversations/${existingThread.id}`) : setContactOpen(true)
        }
      />
      {b.review ? (
        <Card style={styles.reviewCard}>
          <Text variant="bodyStrong">Avis du client</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={18}
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
          {fullReview?.reply ? (
            <Text variant="sm">
              <Text variant="smStrong">Votre réponse : </Text>
              {fullReview.reply}
            </Text>
          ) : (
            <>
              <Input
                label="Répondre publiquement"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />
              <Button
                label="Publier la réponse"
                size="sm"
                disabled={replyText.trim().length === 0}
                loading={replyReview.isPending}
                onPress={() =>
                  replyReview.mutate(
                    { reviewId: b.review!.id, reply: replyText.trim() },
                    {
                      onError: (e) =>
                        Alert.alert(
                          "Réponse non publiée",
                          e instanceof ApiRequestError ? e.message : "Réessayez.",
                        ),
                    },
                  )
                }
              />
            </>
          )}
        </Card>
      ) : null}
      <ContactSheet
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        organizationId={organizationId}
        organizationName={b.loueurName}
        bookingId={b.id}
        toCustomerName={b.customer?.firstName ?? "le client"}
      />
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
      <ConfirmSheet
        visible={paperFor !== null}
        onClose={() => setPaperFor(null)}
        title="État des lieux de retour non fait ici"
        message="L'état des lieux protège le loueur et le client. L'avez-vous fait sur papier ?"
        confirmLabel="Oui, sur papier : valider"
        destructive={false}
        secondaryLabel="Le faire dans l'application"
        onSecondary={() => {
          setPaperFor(null);
          router.push(`/(pro)/organizations/${organizationId}/bookings/${bookingId}/inspection`);
        }}
        cancelLabel="Annuler"
        onConfirm={() => {
          const action = paperFor;
          setPaperFor(null);
          if (action) run(action);
        }}
      />
      <ReviewCustomerSheet
        bookingId={b.id}
        customerName={name}
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
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

/** Case a cocher de confirmation (remise du vehicule) : verrouillee quand l'application a la preuve. */
function CheckRow({
  label,
  hint,
  checked,
  locked = false,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  locked?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: locked }}
      disabled={locked}
      onPress={onToggle}
      style={styles.checkRow}
    >
      <View style={[styles.checkBox, checked ? styles.checkBoxOn : null]}>
        {checked ? <Check size={16} color="#ffffff" strokeWidth={3} /> : null}
      </View>
      <View style={styles.flex}>
        <Text variant="smStrong">{label}</Text>
        {hint ? (
          <Text variant="small" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handover: { gap: theme.space["3"] },
  checkRow: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxOn: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["4"],
    paddingVertical: theme.space["3"],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customerTexts: { flex: 1, gap: 2 },
  reviewCard: { gap: theme.space["3"] },
  stars: { flexDirection: "row", gap: 4 },
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
