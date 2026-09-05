import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Zone d'authentification : inaccessible a un utilisateur deja connecte, sauf pour changer de mot de passe. */
export default function AuthLayout() {
  const { session, loading } = useSession();
  const params = useLocalSearchParams<{ flow?: string }>();
  if (!loading && session && params.flow !== "recovery") return <Redirect href="/(tabs)/profil" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
