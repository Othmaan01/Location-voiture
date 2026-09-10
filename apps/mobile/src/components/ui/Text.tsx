import {
  Text as RNText,
  StyleSheet,
  type ColorValue,
  type TextProps as RNTextProps,
} from "react-native";

import { fontFamily, theme } from "@/theme";

export type TextVariant =
  "display" | "h1" | "h2" | "body" | "bodyStrong" | "sm" | "smStrong" | "small" | "caps";
export type TextTone =
  "default" | "muted" | "dim" | "inverse" | "accent" | "success" | "warning" | "danger";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

const TONES: Record<TextTone, ColorValue> = {
  default: theme.colors.text,
  muted: theme.colors.textMuted,
  dim: theme.colors.textDim,
  inverse: theme.colors.textInverse,
  accent: theme.colors.accentTint,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
};

/** Typographie du design system : toute chaine visible passe par ce composant. */
export function Text({ variant = "body", tone = "default", style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[styles[variant], { color: TONES[tone] }, style]}
      maxFontSizeMultiplier={1.4}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: theme.font.size.display,
    lineHeight: theme.font.lineHeight.display,
    letterSpacing: -1.5,
  },
  h1: {
    fontFamily: fontFamily.extrabold,
    fontSize: theme.font.size["2xl"],
    lineHeight: theme.font.lineHeight["2xl"],
    letterSpacing: theme.font.tracking.tight,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: theme.font.size.lg,
    lineHeight: theme.font.lineHeight.lg,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: theme.font.size.md,
    lineHeight: theme.font.lineHeight.md,
  },
  bodyStrong: {
    fontFamily: fontFamily.bold,
    fontSize: theme.font.size.md,
    lineHeight: theme.font.lineHeight.md,
  },
  sm: {
    fontFamily: fontFamily.medium,
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight.sm,
  },
  smStrong: {
    fontFamily: fontFamily.bold,
    fontSize: theme.font.size.sm,
    lineHeight: theme.font.lineHeight.sm,
  },
  small: {
    fontFamily: fontFamily.medium,
    fontSize: theme.font.size.xs,
    lineHeight: theme.font.lineHeight.xs,
  },
  caps: {
    fontFamily: fontFamily.extrabold,
    fontSize: theme.font.size.xs,
    lineHeight: theme.font.lineHeight.xs,
    letterSpacing: theme.font.tracking.caps,
    textTransform: "uppercase",
  },
});
