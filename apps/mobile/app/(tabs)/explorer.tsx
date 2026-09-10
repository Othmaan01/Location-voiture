import { Screen } from "@/components/ui";
import { ExplorerPanel } from "@/features/client/ExplorerPanel";

/** Explorer : la meme recherche que l'onglet « Tous » de l'accueil, en page dediee (liens, historique). */
export default function ExploreScreen() {
  return (
    <Screen title="Explorer" dock>
      <ExplorerPanel />
    </Screen>
  );
}
