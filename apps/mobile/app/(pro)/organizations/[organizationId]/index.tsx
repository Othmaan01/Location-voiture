import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Building2, Users } from "lucide-react-native";

import { Avatar, Badge, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { useMembers, useOrganization } from "@/lib/queries";
import { theme } from "@/theme";

const STATUS: Record<
  string,
  { label: string; tone: "accent" | "success" | "warning" | "neutral" }
> = {
  draft: { label: "Brouillon", tone: "neutral" },
  submitted: { label: "Vérification demandée", tone: "warning" },
  under_review: { label: "En cours de vérification", tone: "warning" },
  verified: { label: "Vérifié", tone: "success" },
  rejected: { label: "Refusé", tone: "accent" },
  suspended: { label: "Suspendu", tone: "accent" },
};

export default function OrganizationScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const org = useOrganization(organizationId);
  const members = useMembers(organizationId);

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
  const status = STATUS[org.data.status] ?? STATUS["draft"]!;

  return (
    <Screen eyebrow="Espace professionnel" back>
      <View style={styles.identity}>
        <Avatar name={org.data.name} size={64} />
        <View style={styles.identityTexts}>
          <Text variant="h1">{org.data.name}</Text>
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>
      <Card padded={false}>
        <ListItem
          icon={<Building2 size={22} color={theme.colors.text} />}
          title="Informations"
          subtitle={org.data.siret ? `SIRET ${org.data.siret}` : "SIRET à renseigner"}
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
          last
        />
      </Card>
      <Card raised>
        <Text variant="bodyStrong">Prochaines étapes</Text>
        <Text variant="sm" tone="muted" style={styles.next}>
          Agences, véhicules, tarifs et documents de vérification arrivent dans la prochaine version
          de l'espace pro.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  identityTexts: { flex: 1, gap: theme.space["2"] },
  next: { marginTop: theme.space["1"] },
});
