import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";

export default function MerchantsScreen() {
  return (
    <Screen title="Loueurs">
      <EmptyState
        title="Tous les loueurs"
        description="Liste et carte des agences vérifiées. Phase 3."
      />
    </Screen>
  );
}
