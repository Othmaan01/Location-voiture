import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, EmptyState, Screen } from "@/components/ui";
import { useSession } from "@/lib/session";

/** Point d'entree de la demande de reservation : le flux complet arrive en Phase 4. */
export default function BookingRequestScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const { session } = useSession();
  void vehicleId;
  return (
    <Screen title="Demande de réservation" back scroll={false}>
      {session ? (
        <EmptyState
          title="Bientôt disponible"
          description="La demande de réservation avec dates, récapitulatif et réponse du loueur arrive dans la prochaine version. En attendant, contactez le loueur depuis son profil."
          action={<Button label="Retour" variant="ghost" onPress={() => router.back()} />}
        />
      ) : (
        <EmptyState
          title="Créez un compte pour réserver"
          description="Un compte est demandé uniquement au moment de la réservation."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      )}
    </Screen>
  );
}
