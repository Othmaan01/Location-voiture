import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Camera, ChevronRight, Pencil, Tag, Trash2 } from "lucide-react-native";

import { Badge, Button, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import {
  BLOCKER_LABEL,
  CATEGORY_LABEL,
  FUEL_LABEL,
  TRANSMISSION_LABEL,
  formatEuros,
} from "@/features/pro/labels";
import {
  useDeleteVehicle,
  usePublishCheck,
  useSetVehiclePublished,
  useVehicle,
} from "@/lib/queries-catalog";
import { theme } from "@/theme";

export default function VehicleScreen() {
  const { organizationId, vehicleId } = useLocalSearchParams<{
    organizationId: string;
    vehicleId: string;
  }>();
  const router = useRouter();
  const vehicle = useVehicle(vehicleId);
  const check = usePublishCheck(vehicleId);
  const setPublished = useSetVehiclePublished(organizationId, vehicleId);
  const remove = useDeleteVehicle(organizationId, vehicleId);

  if (vehicle.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (vehicle.isError || !vehicle.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState title="Véhicule introuvable" />
      </Screen>
    );
  }
  const v = vehicle.data;
  const published = v.status === "published";
  const blockers = check.data?.blockers ?? [];

  const togglePublish = () =>
    setPublished.mutate(!published, {
      onError: (e) =>
        Alert.alert(
          "Publication impossible",
          e instanceof ApiRequestError ? e.message : "Réessayez plus tard.",
        ),
    });
  const confirmDelete = () =>
    Alert.alert(
      "Supprimer ce véhicule ?",
      "Il disparaît de votre flotte et de l'app. S'il a déjà eu des réservations, il est archivé et son historique est conservé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            remove.mutate(undefined, {
              onSuccess: (r) => {
                if (r.outcome === "archived")
                  Alert.alert(
                    "Véhicule archivé",
                    "Il avait un historique de réservations : il est conservé mais n'apparaît plus.",
                  );
                router.back();
              },
              onError: (e) =>
                Alert.alert(
                  "Suppression impossible",
                  e instanceof ApiRequestError ? e.message : "Réessayez.",
                ),
            }),
        },
      ],
    );

  /** Chaque bloqueur ouvre l'ecran ou il se corrige. */
  const resolveBlocker = (b: string) => {
    if (b === "organization_not_verified")
      router.push(`/(pro)/organizations/${organizationId}/documents`);
    else if (b === "agency_incomplete")
      router.push(`/(pro)/organizations/${organizationId}/agencies/${v.agencyId}`);
    else if (b === "no_photo")
      router.push(`/(pro)/organizations/${organizationId}/vehicles/${vehicleId}/photos`);
    else if (b === "no_rate_plan")
      router.push(`/(pro)/organizations/${organizationId}/vehicles/${vehicleId}/rate-plan`);
  };

  return (
    <Screen
      title={`${v.brand} ${v.model}`}
      back
      headerRight={
        <Badge
          label={published ? "Publié" : v.suspendedAt ? "Suspendu" : "Brouillon"}
          tone={published ? "success" : v.suspendedAt ? "accent" : "neutral"}
        />
      }
    >
      {v.photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {v.photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.url }}
              style={styles.photo}
              contentFit="cover"
              transition={150}
            />
          ))}
        </ScrollView>
      ) : (
        <Card raised style={styles.noPhoto}>
          <Camera size={28} color={theme.colors.textDim} />
          <Text variant="sm" tone="muted">
            Aucune photo. La première photo est la vignette du véhicule.
          </Text>
        </Card>
      )}

      <Text variant="sm" tone="muted">
        {[
          CATEGORY_LABEL[v.category],
          TRANSMISSION_LABEL[v.transmission],
          FUEL_LABEL[v.fuel],
          `${v.seats} places`,
          v.year ?? null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>

      <Card padded={false}>
        <ListItem
          icon={<Camera size={22} color={theme.colors.text} />}
          title="Photos"
          subtitle={`${v.photos.length} sur 30`}
          onPress={() =>
            router.push(`/(pro)/organizations/${organizationId}/vehicles/${vehicleId}/photos`)
          }
        />
        <ListItem
          icon={<Tag size={22} color={theme.colors.text} />}
          title="Tarif"
          subtitle={
            v.ratePlan
              ? `${formatEuros(v.ratePlan.dailyCents)} / jour · caution ${formatEuros(v.ratePlan.depositCents)}`
              : "À définir"
          }
          onPress={() =>
            router.push(`/(pro)/organizations/${organizationId}/vehicles/${vehicleId}/rate-plan`)
          }
        />
        <ListItem
          icon={<Pencil size={22} color={theme.colors.text} />}
          title="Caractéristiques"
          subtitle="Marque, modèle, conditions"
          onPress={() =>
            router.push(`/(pro)/organizations/${organizationId}/vehicles/${vehicleId}/edit`)
          }
          last
        />
      </Card>

      <Card style={[styles.publishCard, published ? styles.publishCardOn : null]}>
        <Text variant="bodyStrong">{published ? "Visible des clients" : "Pas encore visible"}</Text>
        {!published && blockers.length > 0 ? (
          <Card padded={false} raised>
            {blockers.map((b, i) => (
              <ListItem
                key={b}
                title={BLOCKER_LABEL[b] ?? b}
                subtitle={b === "quota_reached" ? undefined : "Appuyez pour corriger"}
                right={
                  b === "quota_reached" ? undefined : (
                    <ChevronRight size={18} color={theme.colors.textDim} />
                  )
                }
                onPress={b === "quota_reached" ? undefined : () => resolveBlocker(b)}
                last={i === blockers.length - 1}
              />
            ))}
          </Card>
        ) : null}
        {!published && blockers.length === 0 && check.data ? (
          <Text variant="sm" tone="muted">
            Tout est prêt. Publiez pour apparaître dans l'application.
          </Text>
        ) : null}
        <Button
          label={published ? "Dépublier" : "Publier le véhicule"}
          variant={published ? "ghost" : "accent"}
          disabled={!published && (blockers.length > 0 || !!v.suspendedAt)}
          loading={setPublished.isPending}
          onPress={togglePublish}
        />
      </Card>

      <Button
        label="Supprimer le véhicule"
        variant="danger"
        icon={<Trash2 size={18} color={theme.colors.danger} />}
        loading={remove.isPending}
        onPress={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { gap: theme.space["2"] },
  photo: {
    width: 220,
    height: 150,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceRaised,
  },
  noPhoto: { alignItems: "center", gap: theme.space["2"], paddingVertical: theme.space["5"] },
  publishCard: { gap: theme.space["3"] },
  publishCardOn: { borderColor: theme.colors.success },
  blockers: { gap: 4 },
});
