import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";
import { MapPin, Plus } from "lucide-react-native";

import { Badge, Button, Card, EmptyState, ListItem, Screen } from "@/components/ui";
import { useAgencies } from "@/lib/queries-catalog";
import { theme } from "@/theme";

export default function AgenciesScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const agencies = useAgencies(organizationId);
  return (
    <Screen
      title="Agences"
      back
      headerRight={
        <Button
          label="Ajouter"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies/new`)}
        />
      }
    >
      {agencies.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {agencies.data && agencies.data.agencies.length === 0 ? (
        <EmptyState
          title="Aucune agence"
          description="Une agence est un point de retrait : adresse, horaires, téléphone. Il en faut au moins une pour publier un véhicule."
          action={
            <Button
              label="Créer ma première agence"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies/new`)}
            />
          }
        />
      ) : null}
      {agencies.data && agencies.data.agencies.length > 0 ? (
        <Card padded={false}>
          {agencies.data.agencies.map((a, i) => (
            <ListItem
              key={a.id}
              icon={<MapPin size={22} color={theme.colors.text} />}
              title={a.name}
              subtitle={
                [a.addressLine, a.postalCode, a.cityName].filter(Boolean).join(", ") ||
                "Adresse à compléter"
              }
              right={
                <Badge
                  label={
                    a.status === "published"
                      ? "Publiée"
                      : a.status === "suspended"
                        ? "Suspendue"
                        : "Brouillon"
                  }
                  tone={
                    a.status === "published"
                      ? "success"
                      : a.status === "suspended"
                        ? "accent"
                        : "neutral"
                  }
                />
              }
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies/${a.id}`)}
              last={i === agencies.data.agencies.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
