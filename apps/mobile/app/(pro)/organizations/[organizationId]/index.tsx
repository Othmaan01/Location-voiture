import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Building2,
  CalendarDays,
  Car,
  FileCheck2,
  Inbox,
  MapPin,
  Users,
} from "lucide-react-native";

import { Avatar, Badge, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { useMembers, useOrganization } from "@/lib/queries";
import { useOrgBookings } from "@/lib/queries-bookings";
import { useAgencies, useVehicles, useVerification } from "@/lib/queries-catalog";
import { ORG_STATUS } from "@/features/pro/labels";
import { theme } from "@/theme";

export default function OrganizationScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const org = useOrganization(organizationId);
  const members = useMembers(organizationId);
  const agencies = useAgencies(organizationId);
  const vehicles = useVehicles(organizationId);
  const verification = useVerification(organizationId);
  const pending = useOrgBookings(organizationId, "upcoming", "requested");

  if (org.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (org.isError || !org.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState
          title="Organisation introuvable"
          description="Elle n'existe pas ou vous n'y avez pas accès."
        />
      </Screen>
    );
  }
  const status = ORG_STATUS[org.data.status] ?? ORG_STATUS["draft"]!;
  const missing = verification.data?.missing.length ?? 0;
  const published = vehicles.data?.vehicles.filter((v) => v.status === "published").length ?? 0;

  return (
    <Screen eyebrow="Espace professionnel" back>
      <View style={styles.identity}>
        <Avatar name={org.data.name} size={64} />
        <View style={styles.identityTexts}>
          <Text variant="h1">{org.data.name}</Text>
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>

      {org.data.status === "draft" || org.data.status === "rejected" ? (
        <Card style={styles.callout}>
          <Text variant="bodyStrong">
            {org.data.status === "rejected" ? "Dossier refusé" : "Faites vérifier votre entreprise"}
          </Text>
          <Text variant="sm" tone="muted">
            {org.data.status === "rejected"
              ? "Corrigez les points signalés puis soumettez de nouveau."
              : "Kbis, assurance, votre SIREN et une agence avec son SIRET et son adresse. Vous pouvez préparer vos véhicules en attendant, la publication s'ouvre après vérification."}
          </Text>
        </Card>
      ) : null}
      <Card padded={false}>
        <ListItem
          icon={<Inbox size={22} color={theme.colors.accentTint} />}
          title="Demandes et réservations"
          subtitle={
            pending.data
              ? pending.data.bookings.length > 0
                ? `${pending.data.bookings.length} demande${pending.data.bookings.length > 1 ? "s" : ""} à traiter`
                : "Aucune demande en attente"
              : undefined
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/bookings`)}
        />
        <ListItem
          icon={<CalendarDays size={22} color={theme.colors.text} />}
          title="Calendrier"
          subtitle="Réservations et blocages par véhicule"
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/calendar`)}
          last
        />
      </Card>

      <Card padded={false}>
        <ListItem
          icon={<FileCheck2 size={22} color={theme.colors.text} />}
          title="Vérification et documents"
          subtitle={
            missing > 0
              ? `${missing} élément${missing > 1 ? "s" : ""} manquant${missing > 1 ? "s" : ""}`
              : status.label
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/documents`)}
        />
        <ListItem
          icon={<MapPin size={22} color={theme.colors.text} />}
          title="Agences"
          subtitle={
            agencies.data
              ? `${agencies.data.agencies.length} agence${agencies.data.agencies.length > 1 ? "s" : ""}`
              : undefined
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies`)}
        />
        <ListItem
          icon={<Car size={22} color={theme.colors.text} />}
          title="Véhicules"
          subtitle={
            vehicles.data
              ? `${vehicles.data.vehicles.length} au total · ${published} publié${published > 1 ? "s" : ""}`
              : undefined
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles`)}
        />
        <ListItem
          icon={<Users size={22} color={theme.colors.text} />}
          title="Membres"
          subtitle={
            members.data
              ? `${members.data.members.length} membre${members.data.members.length > 1 ? "s" : ""}`
              : undefined
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/members`)}
        />
        <ListItem
          icon={<Building2 size={22} color={theme.colors.text} />}
          title="Informations"
          subtitle={org.data.siren ? `SIREN ${org.data.siren}` : "SIREN à renseigner"}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/edit`)}
          last
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  identityTexts: { flex: 1, gap: theme.space["2"] },
  callout: { borderColor: theme.colors.accentDark, gap: theme.space["2"] },
});
