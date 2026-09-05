import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

/** Pastille d'initiales : utilisateurs et organisations (logos a venir en Phase 2). */
export function Avatar({
  name,
  size = 44,
  round = false,
}: {
  name: string;
  size?: number;
  round?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: round ? theme.radius.full : Math.round(size * 0.27),
        },
      ]}
    >
      <Text
        variant="bodyStrong"
        style={{ fontSize: Math.round(size * 0.34), lineHeight: Math.round(size * 0.44) }}
      >
        {initials || "?"}
      </Text>
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
  },
});
