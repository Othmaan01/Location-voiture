import type { ReactNode } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

export type BadgeTone = "accent" | "success" | "warning" | "neutral";

const TONES: Record<BadgeTone, { bg: ColorValue; fg: ColorValue }> = {
  accent: { bg: theme.colors.accentSoft, fg: theme.colors.accentTint },
  success: { bg: theme.colors.successSoft, fg: theme.colors.success },
  warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
  neutral: { bg: theme.colors.surfaceHigh, fg: theme.colors.textMuted },
};

export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon}
      <Text variant="small" style={[styles.label, { color: t.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 22,
    paddingHorizontal: theme.space["2"],
    borderRadius: theme.radius.full,
    alignSelf: "flex-start",
  },
  label: { fontSize: 11, lineHeight: 14, fontWeight: theme.font.weight.bold, letterSpacing: 0.2 },
});
