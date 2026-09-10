import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

import { theme } from "@/theme";

import { Text } from "./Text";

export interface ScreenProps extends PropsWithChildren {
  title?: string;
  eyebrow?: string;
  back?: boolean;
  headerRight?: ReactNode;
  /** Laisse la place a la barre capsule (ecrans a onglets). */
  dock?: boolean;
  scroll?: boolean;
  /** Le contenu file sous la capsule (liste interne qui gere sa propre marge basse) : pas de bande noire. */
  bleed?: boolean;
  /** Fige le defilement pendant un geste (signature au doigt). */
  scrollEnabled?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Conteneur d'ecran : safe areas, fond nuit, en-tete, marge basse pour la capsule. */
export function Screen({
  title,
  eyebrow,
  back = false,
  headerRight,
  dock = false,
  scroll = true,
  bleed = false,
  scrollEnabled = true,
  contentStyle,
  children,
}: ScreenProps) {
  const router = useRouter();
  // Les ecrans a onglets n'ont pas de fleche : la capsule suffit (retour fondateur, 2026-09-10).
  const showBack = back;
  const header =
    title || showBack || headerRight ? (
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.back}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          {eyebrow ? (
            <Text variant="caps" tone="muted">
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text
              variant="h1"
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;
  const bottomPad = dock
    ? theme.dock.height + theme.dock.bottom + theme.space["5"]
    : theme.space["6"];
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            styles.fill,
            { paddingBottom: bleed ? 0 : bottomPad },
            contentStyle,
          ]}
        >
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: theme.space["4"],
    paddingTop: theme.space["3"],
    gap: theme.space["4"],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["2"],
    minHeight: theme.touch.minTarget,
  },
  back: {
    width: theme.touch.minTarget,
    height: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -12,
  },
  titles: { flex: 1, gap: 2 },
});
