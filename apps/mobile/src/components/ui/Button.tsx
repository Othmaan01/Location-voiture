import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { fontFamily, theme } from "@/theme";

import { Text } from "./Text";

export type ButtonVariant = "accent" | "primary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const BACKGROUND: Record<ButtonVariant, string> = {
  accent: theme.colors.accent,
  primary: theme.colors.text,
  ghost: theme.colors.surfaceRaised,
  danger: theme.colors.dangerSoft,
};
const FOREGROUND: Record<ButtonVariant, string> = {
  accent: "#ffffff",
  primary: theme.colors.textInverse,
  ghost: theme.colors.text,
  danger: theme.colors.danger,
};

/**
 * Bouton du design system. `accent` (rouge) est reserve a l'action principale d'un ecran ;
 * `primary` (blanc) aux actions fortes secondaires ; `ghost` au reste.
 */
export function Button({
  label,
  variant = "accent",
  size = "md",
  loading = false,
  icon,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: BACKGROUND[variant], opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        variant === "ghost" ? styles.ghostBorder : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FOREGROUND[variant]} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              size === "sm" ? styles.labelSm : null,
              { color: FOREGROUND[variant] },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space["4"],
  },
  md: { minHeight: 50 },
  sm: { minHeight: theme.touch.minTarget, paddingHorizontal: theme.space["3"] },
  ghostBorder: { borderWidth: 1, borderColor: theme.colors.border },
  content: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  label: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  labelSm: { fontSize: theme.font.size.sm },
});
