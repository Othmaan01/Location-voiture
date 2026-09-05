import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";

export default function FavoritesScreen() {
  return (
    <Screen title="Favoris">
      <EmptyState
        title="Aucun favori"
        description="Enregistrez des véhicules pour les retrouver ici."
      />
    </Screen>
  );
}
