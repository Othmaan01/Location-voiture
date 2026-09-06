import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Button, EmptyState, Screen } from "@/components/ui";
import { VehicleCard } from "@/features/client/VehicleCard";
import { useFavorites, useToggleFavorite } from "@/lib/queries-public";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

export default function FavoritesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  return (
    <Screen title="Favoris" dock>
      {!session ? (
        <EmptyState
          title="Vos favoris vous attendent"
          description="Connectez-vous pour retrouver les véhicules enregistrés sur tous vos appareils."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      ) : null}
      {session && favorites.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {favorites.data && favorites.data.vehicles.length === 0 ? (
        <EmptyState
          title="Aucun favori"
          description="Touchez le cœur sur un véhicule pour le retrouver ici."
          action={
            <Button
              label="Explorer"
              variant="ghost"
              onPress={() => router.push("/(tabs)/explorer")}
            />
          }
        />
      ) : null}
      {favorites.data && favorites.data.vehicles.length > 0 ? (
        <View style={styles.grid}>
          {favorites.data.vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onPress={() => router.push(`/loueurs/${v.loueurId}`)}
              favorite
              onToggleFavorite={() => toggle.mutate({ vehicleId: v.id, on: false })}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space["3"],
  },
});
