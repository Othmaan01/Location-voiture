import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Espace professionnel : session obligatoire. L'appartenance est verifiee par l'API a chaque appel. */
export default function ProLayout() {
  const { session, loading } = useSession();
  if (!loading && !session) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
