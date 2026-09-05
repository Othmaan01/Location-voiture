import { EmptyState, Screen } from "@/components/ui";

export default function FavoritesScreen() {
  return (
    <Screen title="Favoris" dock>
      <EmptyState
        title="Aucun favori"
        description="Enregistrez des véhicules pour les retrouver ici."
      />
    </Screen>
  );
}
