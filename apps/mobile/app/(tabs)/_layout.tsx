import { Tabs } from "expo-router";
import { Text } from "react-native";

import { theme } from "@/theme";

/**
 * Barre d'onglets client. Les icones vectorielles (lucide / SF Symbols)
 * arrivent avec le design system en Phase 1 ; ici un libelle textuel suffit
 * pour valider la navigation.
 */
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: theme.font.size.xs,
        fontWeight: focused ? theme.font.weight.semibold : theme.font.weight.medium,
        color: focused ? theme.colors.text : theme.colors.textMuted,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          minHeight: theme.touch.minTarget + 12,
        },
        tabBarLabelPosition: "below-icon",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explorer",
          tabBarLabel: ({ focused }) => <TabLabel label="Explorer" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="loueurs"
        options={{
          title: "Loueurs",
          tabBarLabel: ({ focused }) => <TabLabel label="Loueurs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Réservations",
          tabBarLabel: ({ focused }) => <TabLabel label="Réservations" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favoris"
        options={{
          title: "Favoris",
          tabBarLabel: ({ focused }) => <TabLabel label="Favoris" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarLabel: ({ focused }) => <TabLabel label="Profil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
