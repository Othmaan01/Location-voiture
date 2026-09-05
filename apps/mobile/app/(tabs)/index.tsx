import { EmptyState, Screen } from "@/components/ui";

/** Accueil : le feed des loueurs arrive en Phase 3. */
export default function HomeScreen() {
  return (
    <Screen eyebrow="Lyon" title="Loueurs" dock>
      <EmptyState
        title="Le feed arrive bientôt"
        description="Les loueurs vérifiés près de vous s'afficheront ici."
      />
    </Screen>
  );
}
