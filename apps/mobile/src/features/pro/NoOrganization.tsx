import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { Button, EmptyState, Screen } from "@/components/ui";
import { useMe } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Mode loueur sans organisation : une seule action, creer la sienne. */
export function NoOrganization({ title }: { title: string }) {
  const router = useRouter();
  const { session } = useSession();
  const me = useMe();
  return (
    <Screen eyebrow="Espace pro" title={title} dock scroll={false}>
      {session && me.isPending ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : (
        <EmptyState
          title="Votre espace pro"
          description="Créez votre organisation pour publier votre flotte, recevoir des demandes et gérer votre planning."
          action={
            <Button
              label={session ? "Créer mon organisation" : "Se connecter"}
              onPress={() => router.push(session ? "/(pro)/onboarding" : "/(auth)/sign-in")}
            />
          }
        />
      )}
    </Screen>
  );
}
