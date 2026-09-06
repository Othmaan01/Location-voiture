import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Building2, CreditCard, FileCheck2, MapPin, Palette, Users } from "lucide-react-native";

import { Avatar, Badge, Button, Card, ListItem, Screen, Select, Text } from "@/components/ui";
import { ORG_STATUS } from "@/features/pro/labels";
import { NoOrganization } from "@/features/pro/NoOrganization";
import { useCurrentOrganization } from "@/features/pro/use-current-organization";
import { useMode } from "@/lib/mode";
import { useMe, useOrganization } from "@/lib/queries";
import { useOrgBookings } from "@/lib/queries-bookings";
import { useVerification } from "@/lib/queries-catalog";
import { useSubscription } from "@/lib/queries-subscriptions";
import { theme } from "@/theme";

/** Tableau de bord loueur (D9) : etat, chiffres du jour, raccourcis. Une organisation a la fois. */
export default function ProHomeTab() {
  const organizationId = useCurrentOrganization();
  if (!organizationId) return <NoOrganization title="Tableau de bord" />;
  return <Dashboard organizationId={organizationId} />;
}

function Dashboard({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const me = useMe();
  const setOrganization = useMode((s) => s.setOrganization);
  const org = useOrganization(organizationId);
  const verification = useVerification(organizationId);
  const subscription = useSubscription(organizationId);
  const requested = useOrgBookings(organizationId, "upcoming", "requested");
  const memberships = me.data?.memberships ?? [];

  if (org.isPending) {
    return (
      <Screen eyebrow="Espace loueur" title="Tableau de bord" dock scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  const status = ORG_STATUS[org.data?.status ?? "draft"] ?? ORG_STATUS["draft"]!;
  const missing = verification.data?.missing.length ?? 0;
  const pending = requested.data?.bookings.length ?? 0;
  const sub = subscription.data;
  const trialDays = sub?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <Screen eyebrow="Espace loueur" title="Tableau de bord" dock>
      {memberships.length > 1 ? (
        <Select
          label="Organisation"
          value={organizationId}
          options={memberships.map((m) => ({ value: m.organizationId, label: m.organizationName }))}
          onChange={setOrganization}
        />
      ) : null}
      <View style={styles.identity}>
        <Avatar name={org.data?.name ?? ""} uri={org.data?.logoUrl ?? null} size={56} />
        <View style={styles.identityTexts}>
          <Text variant="h2">{org.data?.name}</Text>
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>

      {org.data?.status === "draft" || org.data?.status === "rejected" ? (
        <Card style={styles.callout}>
          <Text variant="bodyStrong">
            {org.data.status === "rejected" ? "Dossier refusé" : "Faites vérifier votre entreprise"}
          </Text>
          <Text variant="sm" tone="muted">
            {missing > 0
              ? `${missing} élément${missing > 1 ? "s" : ""} à compléter avant de soumettre.`
              : "Votre dossier est complet : soumettez-le."}
          </Text>
          <Button
            label="Ouvrir la vérification"
            size="sm"
            onPress={() => router.push(`/(pro)/organizations/${organizationId}/documents`)}
          />
        </Card>
      ) : null}

      <View style={styles.kpis}>
        <Kpi
          value={String(pending)}
          label={pending > 1 ? "demandes à traiter" : "demande à traiter"}
          onPress={() => router.push("/(tabs)/pro-bookings")}
          accent={pending > 0}
        />
        <Kpi
          value={
            sub
              ? `${sub.publishedCount}${sub.plan.maxVehicles ? ` / ${sub.plan.maxVehicles}` : ""}`
              : "—"
          }
          label="véhicules publiés"
          onPress={() => router.push("/(tabs)/pro-vehicles")}
        />
        <Kpi
          value={sub ? (sub.status === "trialing" ? `${trialDays} j` : sub.plan.name) : "—"}
          label={sub?.status === "trialing" ? "d'essai restants" : "offre actuelle"}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/subscription`)}
        />
      </View>

      <Card padded={false}>
        <ListItem
          icon={<MapPin size={22} color={theme.colors.text} />}
          title="Agences"
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies`)}
        />
        <ListItem
          icon={<FileCheck2 size={22} color={theme.colors.text} />}
          title="Vérification et documents"
          subtitle={missing > 0 ? `${missing} manquant${missing > 1 ? "s" : ""}` : status.label}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/documents`)}
        />
        <ListItem
          icon={<Palette size={22} color={theme.colors.text} />}
          title="Apparence"
          subtitle="Logo, bannière, présentation"
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/branding`)}
        />
        <ListItem
          icon={<CreditCard size={22} color={theme.colors.text} />}
          title="Abonnement"
          subtitle={
            sub ? `${sub.plan.name}${sub.status === "trialing" ? " · essai" : ""}` : undefined
          }
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/subscription`)}
        />
        <ListItem
          icon={<Users size={22} color={theme.colors.text} />}
          title="Membres"
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/members`)}
        />
        <ListItem
          icon={<Building2 size={22} color={theme.colors.text} />}
          title="Informations"
          subtitle={org.data?.siren ? `SIREN ${org.data.siren}` : "SIREN à renseigner"}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/edit`)}
          last
        />
      </Card>
      <Button
        label="Créer une autre organisation"
        variant="ghost"
        size="sm"
        onPress={() => router.push("/(pro)/onboarding")}
      />
    </Screen>
  );
}

function Kpi({
  value,
  label,
  onPress,
  accent = false,
}: {
  value: string;
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.kpiWrap}>
      <Card raised style={[styles.kpi, accent ? styles.kpiAccent : null]}>
        <Text variant="h2" tone={accent ? "accent" : "default"}>
          {value}
        </Text>
        <Text variant="small" tone="muted">
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  identityTexts: { flex: 1, gap: theme.space["2"] },
  callout: { borderColor: theme.colors.accentDark, gap: theme.space["2"] },
  kpis: { flexDirection: "row", gap: theme.space["2"] },
  kpiWrap: { flex: 1 },
  kpi: { gap: 2, minHeight: 84, justifyContent: "center" },
  kpiAccent: { borderColor: theme.colors.accentDark },
});
