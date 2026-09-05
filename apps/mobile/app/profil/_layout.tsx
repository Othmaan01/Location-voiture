import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/session";
import { theme } from "@/theme";

export default function ProfileStackLayout() {
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
