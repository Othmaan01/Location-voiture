import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert } from "react-native";
import { Plus, Tag } from "lucide-react-native";

import { Badge, Button, Card, EmptyState, ListItem, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { formatOffer, useArchiveOffer, useOffers } from "@/lib/queries-offers";
import { theme } from "@/theme";

/** Offres du loueur : remise temporaire sur un vehicule ou toute la flotte, visible dans le feed "Offres". */
export default function OffersScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const offers = useOffers(organizationId);
  const archive = useArchiveOffer(organizationId);
  const items = offers.data?.offers ?? [];
  const live = items.filter((o) => o.live);
  const past = items.filter((o) => !o.live);

  const confirmArchive = (id: string, title: string) =>
    Alert.alert("Arrêter cette offre ?", title, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Arrêter",
        style: "destructive",
        onPress: () =>
          archive.mutate(id, {
            onError: (e) =>
              Alert.alert("Impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
          }),
      },
    ]);

  return (
    <Screen
      title="Offres"
      back
      headerRight={
        <Button
          label="Créer"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/offers/new`)}
        />
      }
    >
      <Text variant="sm" tone="muted">
        Une offre en cours place votre organisation dans l&apos;onglet « Offres » du feed et affiche
        le prix barré sur vos véhicules. La remise est appliquée automatiquement sur les demandes.
      </Text>
      {offers.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {offers.data && items.length === 0 ? (
        <EmptyState
          title="Aucune offre"
          description="Une remise de 10 à 20 % sur quelques jours suffit souvent à remplir un week-end creux."
          action={
            <Button
              label="Créer ma première offre"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/offers/new`)}
            />
          }
        />
      ) : null}
      {live.length > 0 ? (
        <Card padded={false}>
          {live.map((o, i) => (
            <ListItem
              key={o.id}
              icon={<Tag size={22} color={theme.colors.accentTint} />}
              title={`${formatOffer(o)} · ${o.title}`}
              subtitle={`${o.vehicleLabel ?? "Toute la flotte"} · jusqu'au ${new Date(o.endsAt).toLocaleDateString("fr-FR")}`}
              right={<Badge label="En cours" tone="success" />}
              onPress={() => confirmArchive(o.id, o.title)}
              last={i === live.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {past.length > 0 ? (
        <>
          <Text variant="smStrong" tone="muted">
            Terminées
          </Text>
          <Card padded={false}>
            {past.map((o, i) => (
              <ListItem
                key={o.id}
                icon={<Tag size={22} color={theme.colors.textDim} />}
                title={`${formatOffer(o)} · ${o.title}`}
                subtitle={o.vehicleLabel ?? "Toute la flotte"}
                right={<Badge label="Terminée" tone="neutral" />}
                last={i === past.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
