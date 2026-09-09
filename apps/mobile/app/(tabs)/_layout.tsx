import { Tabs, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

import { Dock } from "@/components/ui";
import { PlanGate } from "@/features/pro/PlanGate";
import { MODE_HOME, MODE_SCREENS, useMode } from "@/lib/mode";
import { useMe } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * Un seul navigateur a onglets, trois capsules (D9) : la capsule n'affiche que les onglets
 * du mode courant, et le garde ramene a l'accueil du mode quand l'ecran n'en fait pas partie.
 */
function ModeGuard() {
  const { mode, hydrated, hydrate, applyUser, setMode } = useMode();
  const { session, loading } = useSession();
  const me = useMe();
  const segments = useSegments();
  const router = useRouter();
  const current = segments[0] === "(tabs)" ? (segments[1] ?? "index") : null;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (me.data) applyUser(me.data);
  }, [me.data, applyUser]);
  useEffect(() => {
    if (!loading && !session && mode !== "client") setMode("client");
  }, [loading, session, mode, setMode]);
  useEffect(() => {
    if (!hydrated || current === null) return;
    if (!MODE_SCREENS[mode].includes(current)) router.replace(MODE_HOME[mode]);
  }, [hydrated, mode, current, router]);
  return null;
}

export default function TabsLayout() {
  return (
    <>
      <ModeGuard />
      <PlanGate />
      <Tabs
        tabBar={(props) => <Dock {...props} />}
        backBehavior="history"
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      >
        <Tabs.Screen name="index" options={{ title: "Accueil" }} />
        <Tabs.Screen name="explorer" options={{ title: "Explorer" }} />
        <Tabs.Screen name="locations" options={{ title: "Locations" }} />
        <Tabs.Screen name="favoris" options={{ title: "Favoris" }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="pro-messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="pro-home" options={{ title: "Tableau de bord" }} />
        <Tabs.Screen name="pro-bookings" options={{ title: "Réservations" }} />
        <Tabs.Screen name="pro-vehicles" options={{ title: "Véhicules" }} />
        <Tabs.Screen name="pro-showcase" options={{ title: "Vitrine" }} />
        <Tabs.Screen name="pro-calendar" options={{ title: "Calendrier" }} />
        <Tabs.Screen name="admin-verifications" options={{ title: "Vérifications" }} />
        <Tabs.Screen name="admin-loueurs" options={{ title: "Loueurs" }} />
        <Tabs.Screen name="admin-reports" options={{ title: "Signalements" }} />
        <Tabs.Screen name="profil" options={{ title: "Profil" }} />
      </Tabs>
    </>
  );
}
