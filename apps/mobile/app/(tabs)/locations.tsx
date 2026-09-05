import { useRouter } from "expo-router";

import { Button, EmptyState, Screen } from "@/components/ui";
import { useSession } from "@/lib/session";

export default function RentalsScreen() {
  const { session } = useSession();
  const router = useRouter();
  return (
    <Screen title="Locations" dock>
      {session ? (
        <EmptyState
          title="Aucune location"
          description="Vos demandes et locations en cours apparaîtront ici."
        />
      ) : (
        <EmptyState
          title="Connectez-vous"
          description="Retrouvez vos demandes et suivez vos locations."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      )}
    </Screen>
  );
}
