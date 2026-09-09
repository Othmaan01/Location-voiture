import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ClipboardCheck, Trash2 } from "lucide-react-native";
import {
  DAMAGE_LABEL,
  type Damage,
  type DamageType,
  type InspectionKind,
  type Signature,
} from "@lv/contracts";

import { Button, Card, Input, Screen, Sheet, Text } from "@/components/ui";
import { CarSketch } from "@/features/inspections/CarSketch";
import { SignaturePad } from "@/features/inspections/SignaturePad";
import { ApiRequestError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { useBooking } from "@/lib/queries-bookings";
import { useCreateInspection } from "@/lib/queries-inspections";
import { useMe } from "@/lib/queries";
import { theme } from "@/theme";

const DAMAGE_TYPES: DamageType[] = ["rayure", "bosse", "eclat", "manque", "autre"];
const FUEL = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Etat des lieux (ADR-0018) : depart ou retour, kilometrage et carburant, dommages sur le croquis,
 * commentaire, signature du client, envoi du PDF par e-mail. Une seule page, du haut vers le bas.
 */
export default function InspectionScreen() {
  const { bookingId } = useLocalSearchParams<{ organizationId: string; bookingId: string }>();
  const router = useRouter();
  const booking = useBooking(bookingId);
  const me = useMe();
  const create = useCreateInspection(bookingId);
  const [kind, setKind] = useState<InspectionKind>(
    booking.data?.status === "active" || booking.data?.status === "completed"
      ? "return"
      : "departure",
  );
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<number | null>(null);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [extraEmail, setExtraEmail] = useState("");
  const [signature, setSignature] = useState<Signature>([]);
  const [signing, setSigning] = useState(false);

  const vehicle = booking.data?.vehicle;
  const customerName =
    [booking.data?.customer?.firstName, booking.data?.customer?.lastName]
      .filter(Boolean)
      .join(" ") || "le client";
  const staffName = [me.data?.firstName, me.data?.lastName].filter(Boolean).join(" ");

  const addDamage = (type: DamageType) => {
    if (!pending) return;
    setDamages([...damages, { ...pending, type, ...(note.trim() ? { note: note.trim() } : {}) }]);
    setPending(null);
    setNote("");
  };
  const removeDamage = (index: number) => {
    setDamages(damages.filter((_, i) => i !== index));
    setEditing(null);
  };

  const submit = () => {
    if (signature.length === 0) {
      Alert.alert("Signature manquante", "Faites signer le client avant d'envoyer.");
      return;
    }
    const email = extraEmail.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Adresse invalide", "Vérifiez l'adresse e-mail supplémentaire.");
      return;
    }
    const km = mileage.replace(/\D/g, "");
    create.mutate(
      {
        kind,
        ...(km ? { mileageKm: Number(km) } : {}),
        ...(fuel !== null ? { fuelEighths: fuel } : {}),
        damages,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        customerSignature: signature,
        ...(staffName ? { staffName } : {}),
        sendTo: email ? [email] : [],
      },
      {
        onSuccess: (inspection) => {
          celebrate(
            kind === "departure"
              ? "État des lieux de départ signé"
              : "État des lieux de retour signé",
            inspection.sentAt
              ? "Le PDF est parti au client, l'agence en copie."
              : "Le PDF est archivé sur la réservation.",
          );
          router.back();
        },
        onError: (e) =>
          Alert.alert("Envoi impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );
  };

  return (
    <Screen title="État des lieux" back scrollEnabled={!signing}>
      {vehicle ? (
        <Text variant="sm" tone="muted">
          {vehicle.brand} {vehicle.model} · avec {customerName}
        </Text>
      ) : null}

      <View style={styles.segment}>
        {(
          [
            { key: "departure", label: "Départ" },
            { key: "return", label: "Retour" },
          ] as const
        ).map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === key }}
            onPress={() => setKind(key)}
            style={[styles.segmentItem, kind === key ? styles.segmentOn : null]}
          >
            <Text variant="smStrong" tone={kind === key ? "inverse" : "muted"}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Input
          label="Kilométrage"
          value={mileage}
          onChangeText={(t) => setMileage(t.replace(/\D/g, "").slice(0, 7))}
          keyboardType="number-pad"
          placeholder="Ex. 42 350"
        />
        <View style={styles.field}>
          <Text variant="smStrong">Carburant</Text>
          <View style={styles.fuel}>
            {FUEL.map((f) => (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityLabel={`${f} huitièmes`}
                onPress={() => setFuel(f)}
                style={[styles.fuelBar, fuel !== null && f <= fuel ? styles.fuelOn : null]}
              />
            ))}
          </View>
          <Text variant="small" tone="dim">
            {fuel === null
              ? "Touchez le niveau"
              : fuel === 8
                ? "Plein"
                : fuel === 0
                  ? "Vide"
                  : `${fuel}/8`}
          </Text>
        </View>
      </Card>

      <View style={styles.field}>
        <Text variant="bodyStrong">Dommages</Text>
        <Text variant="small" tone="muted">
          Touchez l'endroit du dommage sur le croquis, puis choisissez sa nature.
        </Text>
        <CarSketch damages={damages} onAdd={setPending} onSelect={setEditing} />
        {damages.length > 0 ? (
          <Card padded={false}>
            {damages.map((d, i) => (
              <View
                key={i}
                style={[styles.damageRow, i < damages.length - 1 ? styles.damageBorder : null]}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{i + 1}</Text>
                </View>
                <View style={styles.damageTexts}>
                  <Text variant="smStrong">{DAMAGE_LABEL[d.type]}</Text>
                  {d.note ? (
                    <Text variant="small" tone="muted">
                      {d.note}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retirer"
                  onPress={() => removeDamage(i)}
                  hitSlop={8}
                >
                  <Trash2 size={18} color={theme.colors.textDim} />
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}
      </View>

      <Input
        label="Commentaire"
        value={comment}
        onChangeText={setComment}
        placeholder="État général, accessoires, remarques…"
        multiline
        maxLength={2000}
      />
      <Input
        label="Envoyer aussi à (facultatif)"
        hint="Le client reçoit toujours le PDF sur l'adresse de son compte ; l'agence est en copie."
        value={extraEmail}
        onChangeText={setExtraEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="autre@adresse.fr"
      />

      <View style={styles.field}>
        <Text variant="bodyStrong">Signature du client</Text>
        <SignaturePad value={signature} onChange={setSignature} onDrawingChange={setSigning} />
      </View>

      <Button
        label="Envoyer l'état des lieux"
        icon={<ClipboardCheck size={18} color="#ffffff" />}
        loading={create.isPending}
        onPress={submit}
      />

      <Sheet visible={pending !== null} onClose={() => setPending(null)} title="Nature du dommage">
        <View style={styles.types}>
          {DAMAGE_TYPES.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              onPress={() => addDamage(t)}
              style={({ pressed }) => [styles.type, pressed ? styles.typePressed : null]}
            >
              <Text variant="smStrong">{DAMAGE_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="Précision (facultatif)"
          value={note}
          onChangeText={setNote}
          placeholder="Ex. 5 cm, aile avant gauche"
          maxLength={120}
        />
        <Text variant="small" tone="dim">
          Choisissez la nature pour placer le repère.
        </Text>
      </Sheet>

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Dommage">
        {editing !== null && damages[editing] ? (
          <View style={styles.field}>
            <Text variant="bodyStrong">
              {editing + 1}. {DAMAGE_LABEL[damages[editing].type]}
            </Text>
            {damages[editing].note ? (
              <Text variant="sm" tone="muted">
                {damages[editing].note}
              </Text>
            ) : null}
            <Button
              label="Retirer ce dommage"
              variant="danger"
              onPress={() => removeDamage(editing)}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  segmentOn: { backgroundColor: theme.colors.text },
  field: { gap: theme.space["2"] },
  fuel: { flexDirection: "row", gap: 4 },
  fuelBar: {
    flex: 1,
    height: 26,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fuelOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  damageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["4"],
    paddingVertical: theme.space["3"],
  },
  damageBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  damageTexts: { flex: 1, gap: 2 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  types: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  type: {
    paddingHorizontal: theme.space["4"],
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typePressed: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
});
