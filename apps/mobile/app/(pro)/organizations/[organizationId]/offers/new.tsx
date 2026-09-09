import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Button, Input, Screen, Select, Text } from "@/components/ui";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { useVehicles } from "@/lib/queries-catalog";
import { useCreateOffer } from "@/lib/queries-offers";
import { theme } from "@/theme";

const DURATIONS = [
  { value: "3", label: "3 jours" },
  { value: "7", label: "1 semaine" },
  { value: "14", label: "2 semaines" },
  { value: "30", label: "1 mois" },
  { value: "60", label: "2 mois" },
  { value: "90", label: "3 mois" },
];

/** Creation d'une offre : cible, remise, duree. Une nouvelle offre remplace celle en cours sur la meme cible. */
export default function NewOfferScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const vehicles = useVehicles(organizationId);
  const create = useCreateOffer(organizationId);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("15");
  const [duration, setDuration] = useState("14");
  const published = (vehicles.data?.vehicles ?? []).filter((v) => v.status === "published");
  const numeric = Number(value.replace(",", "."));
  const valid =
    title.trim().length >= 2 &&
    Number.isFinite(numeric) &&
    (type === "percent" ? numeric >= 5 && numeric <= 70 : numeric >= 1);

  const submit = () =>
    create.mutate(
      {
        vehicleId: vehicleId || null,
        title: title.trim(),
        discountType: type,
        discountValue: type === "percent" ? Math.round(numeric) : Math.round(numeric * 100),
        durationDays: Number(duration),
      },
      {
        onSuccess: () => {
          celebrate("Offre lancée", "Elle apparaît dans l'onglet Offres du feed.");
          router.back();
        },
        onError: (e) =>
          Alert.alert("Offre non créée", e instanceof ApiRequestError ? e.message : "Réessayez."),
      },
    );

  return (
    <Screen title="Nouvelle offre" back>
      <View style={styles.form}>
        <Select
          label="Sur quoi porte l'offre ?"
          value={vehicleId}
          options={[
            { value: "", label: "Toute la flotte publiée" },
            ...published.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` })),
          ]}
          onChange={setVehicleId}
        />
        <Input
          label="Titre affiché aux clients"
          hint="Court et concret. Ex. : Week-end de rentrée, Dernière minute"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />
        <Select
          label="Type de remise"
          value={type}
          options={[
            { value: "percent", label: "Pourcentage sur la location" },
            { value: "fixed", label: "Montant fixe par location" },
          ]}
          onChange={setType}
        />
        <Input
          label={type === "percent" ? "Remise en % (5 à 70)" : "Remise en euros"}
          hint={
            type === "fixed" && Number.isFinite(numeric) && numeric >= 1
              ? `Soit ${formatEuros(Math.round(numeric * 100))} de moins par location`
              : "Le devis du client applique la remise automatiquement, jamais sur la caution."
          }
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
        />
        <Select
          label="Durée à partir de maintenant"
          value={duration}
          options={DURATIONS}
          onChange={setDuration}
        />
        <Text variant="small" tone="dim">
          Une seule offre à la fois par véhicule (ou pour toute la flotte) : en créer une nouvelle
          remplace la précédente.
        </Text>
        <Button
          label="Lancer l'offre"
          disabled={!valid}
          loading={create.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.space["4"] } });
