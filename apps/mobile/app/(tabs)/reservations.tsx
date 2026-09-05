import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";

export default function BookingsScreen() {
  return (
    <Screen title="Réservations">
      <EmptyState
        title="Aucune réservation"
        description="Vos demandes et réservations apparaîtront ici."
      />
    </Screen>
  );
}
