import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/theme";

interface ScreenProps extends PropsWithChildren {
  title: string;
}

/** Conteneur d'ecran : safe areas, fond, titre. Base commune de tous les ecrans. */
export function Screen({ title, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: theme.space["4"],
    paddingTop: theme.space["3"],
    gap: theme.space["3"],
  },
  title: {
    fontSize: theme.font.size["2xl"],
    lineHeight: theme.font.lineHeight["2xl"],
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
});
