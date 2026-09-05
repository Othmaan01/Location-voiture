import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  right,
  onPress,
  danger = false,
  last = false,
}: ListItemProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        last ? null : styles.border,
        pressed ? styles.pressed : null,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.texts}>
        <Text variant="sm" tone={danger ? "danger" : "default"} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={theme.colors.textDim} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    minHeight: 54,
    paddingHorizontal: theme.space["4"],
  },
  border: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  icon: { width: 24, alignItems: "center" },
  texts: { flex: 1, gap: 1 },
  title: { fontWeight: theme.font.weight.semibold },
});
