import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Check, Sparkles } from "lucide-react-native";
import type { Plan } from "@lv/contracts";

import { Badge, Button, Card, Screen, Text } from "@/components/ui";
import { formatEuros } from "@/features/pro/labels";
import { ApiRequestError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import {
  useChoosePlan,
  useRefreshSubscription,
  useSubscription,
} from "@/lib/queries-subscriptions";
import { theme } from "@/theme";

/** Ce que chaque forfait comprend : tout le monde a tout, seul le nombre de vehicules change. */
const INCLUDED = [
  "Présence sur le site web et référencement local",
  "Demandes de réservation et messagerie",
  "États des lieux signés sur écran, PDF envoyé",
  "Offres et calendrier de disponibilité",
  "Aucune commission sur vos locations",
];

/**
 * Forfaits (ADR-0022) : etape obligatoire avant l'espace loueur (`required=1`), et ecran
 * de passage a l'offre superieure quand la limite est atteinte (`reason=limit`).
 */
export default function PlansScreen() {
  const { organizationId, required, reason } = useLocalSearchParams<{
    organizationId: string;
    required?: string;
    reason?: string;
  }>();
  const router = useRouter();
  const sub = useSubscription(organizationId);
  const choose = useChoosePlan(organizationId);
  const refresh = useRefreshSubscription(organizationId);
  const [selected, setSelected] = useState<string | null>(null);
  const mandatory = required === "1";

  // Retour du navigateur apres le paiement : on relit l'abonnement et on entre si c'est bon.
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => listener.remove();
  }, [refresh]);

  if (sub.isPending) {
    return (
      <Screen title="Votre forfait" scroll={false} {...(mandatory ? {} : { back: true })}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  const s = sub.data;
  if (!s) {
    return (
      <Screen title="Votre forfait" scroll={false} {...(mandatory ? {} : { back: true })}>
        <Text tone="muted">Impossible de charger les forfaits.</Text>
      </Screen>
    );
  }
  const plans = s.plans.filter((p) => !p.isQuote);
  const quote = s.plans.find((p) => p.isQuote) ?? null;
  const currentIndex = plans.findIndex((p) => p.code === s.plan.code);
  const suggested: Plan | null =
    reason === "limit"
      ? (plans[currentIndex + 1] ?? null)
      : (plans[Math.max(0, currentIndex)] ?? null);
  const active = selected ?? suggested?.code ?? plans[0]?.code ?? null;

  const confirm = () => {
    if (!active) return;
    choose.mutate(active, {
      onSuccess: (r) => {
        if (r.checkoutUrl) {
          void Linking.openURL(r.checkoutUrl).catch(() =>
            Alert.alert("Ouverture impossible", "Réessayez."),
          );
          return;
        }
        celebrate(
          reason === "limit" ? "Forfait mis à jour" : "Bienvenue dans votre espace loueur",
          reason === "limit"
            ? "Vous pouvez publier vos véhicules supplémentaires."
            : "Votre essai gratuit de 14 jours commence maintenant.",
        );
        if (reason === "limit") router.back();
        else router.replace("/(tabs)/pro-home");
      },
      onError: (e) =>
        Alert.alert("Choix impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
    });
  };

  return (
    <Screen
      eyebrow={mandatory ? "Dernière étape" : "Abonnement"}
      title={reason === "limit" ? "Limite atteinte" : "Choisissez votre forfait"}
      {...(mandatory ? {} : { back: true })}
    >
      {reason === "limit" ? (
        <Card style={styles.notice}>
          <Text variant="bodyStrong">
            Votre forfait {s.plan.name} permet {s.plan.maxVehicles ?? "—"} véhicule
            {(s.plan.maxVehicles ?? 0) > 1 ? "s" : ""} publié
            {(s.plan.maxVehicles ?? 0) > 1 ? "s" : ""}.
          </Text>
          <Text variant="sm" tone="muted">
            Vous en avez {s.publishedCount} en ligne. Passez au forfait suivant en un geste, sans
            interruption : vos véhicules restent publiés.
          </Text>
        </Card>
      ) : (
        <Text variant="sm" tone="muted">
          Un seul critère : le nombre de véhicules publiés. Tout le reste est compris, et vous ne
          payez aucune commission sur vos locations. Changement possible à tout moment.
        </Text>
      )}

      <View style={styles.plans}>
        {plans.map((p) => {
          const on = p.code === active;
          const current = p.code === s.plan.code && !mandatory;
          return (
            <Pressable
              key={p.code}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(p.code)}
              style={[styles.plan, on ? styles.planOn : null]}
            >
              <View style={styles.planHead}>
                <View style={[styles.radio, on ? styles.radioOn : null]}>
                  {on ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
                </View>
                <View style={styles.flex}>
                  <View style={styles.row}>
                    <Text variant="bodyStrong">{p.name}</Text>
                    {current ? <Badge label="Actuel" tone="neutral" /> : null}
                    {suggested?.code === p.code && reason === "limit" ? (
                      <Badge
                        label="Recommandé"
                        tone="accent"
                        icon={
                          <Sparkles size={12} color={theme.colors.accentTint} strokeWidth={2.5} />
                        }
                      />
                    ) : null}
                  </View>
                  <Text variant="small" tone="muted">
                    {p.maxVehicles
                      ? `Jusqu'à ${p.maxVehicles} véhicule${p.maxVehicles > 1 ? "s" : ""} publié${p.maxVehicles > 1 ? "s" : ""}`
                      : `${p.minVehicles} véhicules et plus`}
                  </Text>
                </View>
                <View style={styles.price}>
                  <Text variant="h2">{formatEuros(p.monthlyPriceCents)}</Text>
                  <Text variant="small" tone="muted">
                    / mois HT
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.included}>
        <Text variant="smStrong">Compris dans chaque forfait</Text>
        {INCLUDED.map((line) => (
          <View key={line} style={styles.includedRow}>
            <Check size={16} color={theme.colors.success} strokeWidth={2.5} />
            <Text variant="sm" tone="muted" style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
        <Text variant="small" tone="dim">
          14 jours d'essai gratuit, résiliable à tout moment.
        </Text>
      </Card>

      <Button
        label={
          s.billingEnabled
            ? "Valider et renseigner mon paiement"
            : reason === "limit"
              ? "Passer à ce forfait"
              : "Valider et entrer dans mon espace"
        }
        loading={choose.isPending}
        disabled={!active}
        onPress={confirm}
      />
      {quote ? (
        <Button
          label={`Plus de ${plans[plans.length - 1]?.maxVehicles ?? 30} véhicules ? Parlons-en`}
          variant="ghost"
          size="sm"
          onPress={() => void Linking.openURL("mailto:sav@karson.fr")}
        />
      ) : null}
      <Text variant="small" tone="dim">
        {s.billingEnabled
          ? "Paiement sécurisé par Stripe, dans votre navigateur. Rien n'est débité pendant l'essai."
          : "Le paiement par carte sera demandé à la fin de l'essai, dès qu'il sera activé sur la plateforme."}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space["2"], flexWrap: "wrap" },
  notice: { gap: theme.space["1"], borderColor: theme.colors.accentDark },
  plans: { gap: theme.space["2"] },
  plan: {
    padding: theme.space["4"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  planOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceRaised },
  planHead: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  price: { alignItems: "flex-end" },
  included: { gap: theme.space["2"] },
  includedRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.space["2"] },
});
