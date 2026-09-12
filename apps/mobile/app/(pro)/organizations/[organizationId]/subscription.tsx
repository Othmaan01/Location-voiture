import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, AppState, Linking, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { Badge, Button, Card, Screen, Text } from "@/components/ui";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import {
  useBillingPortal,
  useCheckout,
  useRefreshSubscription,
  useSubscription,
} from "@/lib/queries-subscriptions";
import { theme } from "@/theme";

/** Abonnement (D10) : offre en cours, essai, grille. Le changement d'offre arrive avec le paiement (Phase 5). */
export default function SubscriptionScreen() {
  const { organizationId, checkout: checkoutResult } = useLocalSearchParams<{
    organizationId: string;
    checkout?: string;
  }>();
  const router = useRouter();
  const sub = useSubscription(organizationId);
  const checkout = useCheckout(organizationId);
  const portal = useBillingPortal(organizationId);
  const refresh = useRefreshSubscription(organizationId);

  // Retour du navigateur (paiement ou portail) : on relit l'abonnement.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
  useEffect(() => {
    if (checkoutResult === "success")
      Alert.alert(
        "Merci",
        "Votre abonnement est en cours d'activation, cela prend quelques secondes.",
      );
  }, [checkoutResult]);

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert("Ouverture impossible", "Réessayez."));
  const fail = (e: unknown) =>
    Alert.alert("Indisponible", e instanceof ApiRequestError ? e.message : "Réessayez.");

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
                  : s.status === "past_due"
                    ? "Paiement en échec"
                    : s.status === "canceled"
                      ? "Résiliée"
                      : "Active"
            }
            tone={
              s.status === "trial_expired" || s.status === "past_due"
                ? "warning"
                : s.status === "canceled"
                  ? "accent"
                  : "success"
            }
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
            {s.billingEnabled
              ? "Votre essai est terminé : choisissez une offre ci-dessous pour continuer."
              : "Votre essai est terminé. Le paiement en ligne arrive bientôt : rien ne change pour vous d'ici là."}
          </Text>
        ) : null}
        {s.currentPeriodEnd ? (
          <Text variant="small" tone="dim">
            {s.cancelAtPeriodEnd ? "Prend fin le " : "Prochain renouvellement le "}
            {new Date(s.currentPeriodEnd).toLocaleDateString("fr-FR")}.
          </Text>
        ) : null}
        {s.billingEnabled && s.hasBillingAccount ? (
          <Button
            label="Gérer mon abonnement et mes factures"
            variant="ghost"
            size="sm"
            loading={portal.isPending}
            onPress={() =>
              portal.mutate(undefined, { onSuccess: (r) => void openUrl(r.url), onError: fail })
            }
          />
        ) : null}
      </Card>

      <Button
        label="Changer de forfait"
        variant="ghost"
        size="sm"
        onPress={() =>
          router.push({
            pathname: "/(pro)/organizations/[organizationId]/plans",
            params: { organizationId },
          })
        }
      />
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
                onPress={() => void Linking.openURL("mailto:sav@karson.fr")}
              />
            ) : s.billingEnabled &&
              (!current || s.status === "canceled" || s.status === "trial_expired") ? (
              <Button
                label={current ? "Réactiver cette offre" : "Choisir cette offre"}
                size="sm"
                loading={checkout.isPending && checkout.variables === p.code}
                onPress={() =>
                  checkout.mutate(p.code, { onSuccess: (r) => void openUrl(r.url), onError: fail })
                }
              />
            ) : null}
          </Card>
        );
      })}
      <Text variant="small" tone="dim">
        {s.billingEnabled
          ? "Paiement sécurisé par Stripe, dans votre navigateur. Prix hors taxes, résiliable à tout moment."
          : "Le paiement par carte et les factures arrivent avec la prochaine version. Les prix sont hors taxes."}
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
