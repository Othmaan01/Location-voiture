import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

import { Button, EmptyState, Screen } from "@/components/ui";
import { useAcceptInvitation } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Lien profond lv://invitations/<token> : acceptation d'une invitation a rejoindre une organisation. */
export default function AcceptInvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useSession();
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!loading && session && token && !started) {
      setStarted(true);
      accept.mutate(token, {
        onSuccess: (r) => router.replace(`/(pro)/organizations/${r.organizationId}`),
      });
    }
  }, [loading, session, token, started, accept, router]);

  if (!loading && !session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen title="Invitation" scroll={false}>
      {accept.isError ? (
        <EmptyState
          title="Invitation invalide"
          description="Ce lien a expiré, a déjà été utilisé, ou ne correspond pas à l'adresse e-mail de votre compte."
          action={
            <Button
              label="Retour"
              variant="ghost"
              onPress={() => router.replace("/(tabs)/profil")}
            />
          }
        />
      ) : (
        <ActivityIndicator color={theme.colors.accent} />
      )}
    </Screen>
  );
}
