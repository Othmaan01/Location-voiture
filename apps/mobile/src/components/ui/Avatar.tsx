import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { theme } from "@/theme";

import { Text } from "./Text";

/** Pastille d'initiales, ou logo / photo quand il existe : utilisateurs et organisations. */
export function Avatar({
  name,
  uri = null,
  size = 44,
  round = false,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  round?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const radius = round ? theme.radius.full : Math.round(size * 0.27);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={name}
        />
      ) : (
        <Text
          variant="bodyStrong"
          style={{ fontSize: Math.round(size * 0.34), lineHeight: Math.round(size * 0.44) }}
        >
          {initials || "?"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
