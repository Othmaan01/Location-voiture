import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { Badge, Button, Card, Screen, Text } from "@/components/ui";
import { formatEuros } from "@/features/pro/labels";
import { useSubscription } from "@/lib/queries-subscriptions";
import { theme } from "@/theme";

/** Abonnement (D10) : offre en cours, essai, grille. Le changement d'offre arrive avec le paiement (Phase 5). */
export default function SubscriptionScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const sub = useSubscription(organizationId);

  if (sub.isPending) {
    return (
      <Screen title="Abonnement" back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  const s = sub.data;
  if (!s) {
    return (
      <Screen title="Abonnement" back scroll={false}>
        <Text tone="muted">Impossible de charger votre abonnement.</Text>
      </Screen>
    );
  }
  const trialDays = s.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <Screen title="Abonnement" back>
      <Card style={styles.current}>
        <View style={styles.row}>
          <Text variant="bodyStrong">Offre actuelle : {s.plan.name}</Text>
          <Badge
            label={
              s.status === "trialing"
                ? `Essai · ${trialDays} j`
                : s.status === "trial_expired"
                  ? "Essai terminé"
                  : "Active"
            }
            tone={s.status === "trial_expired" ? "warning" : "success"}
          />
        </View>
        <Text variant="h1">
          {s.plan.isQuote ? "Sur devis" : `${formatEuros(s.plan.monthlyPriceCents)} / mois`}
        </Text>
        <Text variant="sm" tone="muted">
          {s.publishedCount} véhicule{s.publishedCount > 1 ? "s" : ""} publié
          {s.publishedCount > 1 ? "s" : ""}
          {s.plan.maxVehicles ? ` sur ${s.plan.maxVehicles} inclus` : ""}.
          {s.status === "trialing"
            ? ` Essai gratuit jusqu'au ${new Date(s.trialEndsAt!).toLocaleDateString("fr-FR")}.`
            : ""}
        </Text>
        {s.status === "trial_expired" ? (
          <Text variant="sm" tone="warning">
            Votre essai est terminé. Le paiement en ligne arrive bientôt : rien ne change pour vous
            d'ici là.
          </Text>
        ) : null}
      </Card>

      <Text variant="h2">Toutes les offres</Text>
      <Text variant="sm" tone="muted">
        Un seul critère : le nombre de véhicules publiés. Aucune commission sur vos locations.
        Changement d'offre à tout moment.
      </Text>
      {s.plans.map((p) => {
        const current = p.code === s.plan.code;
        return (
          <Card key={p.code} style={[styles.plan, current ? styles.planOn : null]}>
            <View style={styles.row}>
              <Text variant="bodyStrong">{p.name}</Text>
              {current ? (
                <Badge
                  label="Votre offre"
                  tone="accent"
                  icon={<Check size={12} color={theme.colors.accentTint} strokeWidth={3} />}
                />
              ) : null}
            </View>
            <Text variant="h2">
              {p.isQuote ? "Sur devis" : `${formatEuros(p.monthlyPriceCents)} / mois`}
            </Text>
            <Text variant="sm" tone="muted">
              {p.maxVehicles
                ? `${p.minVehicles} à ${p.maxVehicles} véhicules publiés`
                : `${p.minVehicles} véhicules et plus`}
              {" · "}14 jours d'essai
            </Text>
            {p.isQuote ? (
              <Button
                label="Nous contacter"
                variant="ghost"
                size="sm"
                onPress={() => void Linking.openURL("mailto:contact@locationvoiture.app")}
              />
            ) : null}
          </Card>
        );
      })}
      <Button label="Changer d'offre — bientôt" disabled onPress={() => undefined} />
      <Text variant="small" tone="dim">
        Le paiement par carte et les factures arrivent avec la prochaine version. Les prix sont hors
        taxes.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { gap: theme.space["2"], borderColor: theme.colors.accentDark },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  plan: { gap: theme.space["1"] },
  planOn: { borderColor: theme.colors.accent },
});
