import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLockGate } from "@/components/AppLockGate";
import { ApiRequestError } from "@/lib/api";
import { PushListener } from "@/lib/push-listener";
import { SessionProvider } from "@/lib/session";
import { theme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              !(error instanceof ApiRequestError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  useEffect(() => {
    if (fontsLoaded || fontsError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <PushListener />
          <AppLockGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
              <Stack.Screen name="(pro)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="loueurs/[loueurId]" />
              <Stack.Screen
                name="stories/[organizationId]"
                options={{ presentation: "fullScreenModal", animation: "fade" }}
              />
              <Stack.Screen name="reservations/[bookingId]" />
              <Stack.Screen name="conversations/[conversationId]" />
              <Stack.Screen
                name="vehicules/[vehicleId]/demande"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="profil" />
              <Stack.Screen name="invitations/[token]" />
            </Stack>
          </AppLockGate>
        </QueryClientProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
