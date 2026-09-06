import { Redirect, Stack } from "expo-router";

import { useMe } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Administration interne : role plateforme obligatoire (verifie a nouveau par l'API a chaque appel). */
export default function AdminLayout() {
  const { session, loading } = useSession();
  const me = useMe();
  if (!loading && !session) return <Redirect href="/(auth)/sign-in" />;
  if (me.data && !me.data.platformRole) return <Redirect href="/(tabs)/profil" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
