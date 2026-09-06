import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Plus } from "lucide-react-native";

import { Badge, Button, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { CATEGORY_LABEL, formatEuros } from "@/features/pro/labels";
import { useAgencies, useVehicles } from "@/lib/queries-catalog";
import { theme } from "@/theme";

export function OrgVehiclesView({
  organizationId,
  embedded = false,
}: {
  organizationId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const vehicles = useVehicles(organizationId);
  const agencies = useAgencies(organizationId);
  const noAgency = agencies.data && agencies.data.agencies.length === 0;

  return (
    <Screen
      title="Véhicules"
      {...(embedded ? { dock: true } : { back: true })}
      headerRight={
        <Button
          label="Ajouter"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          disabled={!!noAgency}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles/new`)}
        />
      }
    >
      {vehicles.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {noAgency ? (
        <EmptyState
          title="Créez d'abord une agence"
          description="Chaque véhicule est rattaché à un point de retrait."
          action={
            <Button
              label="Créer une agence"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies/new`)}
            />
          }
        />
      ) : vehicles.data && vehicles.data.vehicles.length === 0 ? (
        <EmptyState
          title="Aucun véhicule"
          description="Ajoutez votre premier véhicule : caractéristiques, photos, tarif."
          action={
            <Button
              label="Ajouter un véhicule"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles/new`)}
            />
          }
        />
      ) : null}
      {vehicles.data && vehicles.data.vehicles.length > 0 ? (
        <Card padded={false}>
          {vehicles.data.vehicles.map((v, i) => (
            <ListItem
              key={v.id}
              icon={
                v.photos[0] ? (
                  <Image
                    source={{ uri: v.photos[0].url }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Car size={18} color={theme.colors.textDim} />
                  </View>
                )
              }
              title={`${v.brand} ${v.model}`}
              subtitle={`${CATEGORY_LABEL[v.category] ?? v.category}${v.ratePlan ? ` · ${formatEuros(v.ratePlan.dailyCents)}/jour` : " · tarif à définir"}`}
              right={
                <Badge
                  label={
                    v.status === "published" ? "Publié" : v.suspendedAt ? "Suspendu" : "Brouillon"
                  }
                  tone={v.status === "published" ? "success" : v.suspendedAt ? "accent" : "neutral"}
                />
              }
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles/${v.id}`)}
              last={i === vehicles.data.vehicles.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {vehicles.data && vehicles.data.vehicles.length > 0 ? (
        <Text variant="small" tone="dim">
          Un véhicule supprimé est archivé : son historique de réservations est conservé.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 44, height: 34, borderRadius: 8, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
