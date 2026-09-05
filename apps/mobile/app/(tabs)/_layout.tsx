import { Tabs } from "expo-router";

import { Dock } from "@/components/ui";

/** Onglets client (ADR-0009). L'ordre des ecrans est l'ordre de la capsule. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <Dock {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="explorer" options={{ title: "Explorer" }} />
      <Tabs.Screen name="locations" options={{ title: "Locations" }} />
      <Tabs.Screen name="favoris" options={{ title: "Favoris" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
