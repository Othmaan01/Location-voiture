import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";

export default function ExploreScreen() {
  return (
    <Screen title="Explorer">
      <EmptyState
        title="Recherche à venir"
        description="Ville ou position, dates, filtres. Phase 3."
      />
    </Screen>
  );
}
