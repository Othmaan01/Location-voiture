import { EmptyState, Screen } from "@/components/ui";

export default function ExploreScreen() {
  return (
    <Screen title="Explorer" dock>
      <EmptyState
        title="Recherche à venir"
        description="Ville ou position, dates, carte. Phase 3."
      />
    </Screen>
  );
}
