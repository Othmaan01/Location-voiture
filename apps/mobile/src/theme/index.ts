import { DynamicColorIOS, Platform, type ColorValue } from "react-native";
import { lightColors, theme as night, type ColorKey } from "@lv/tokens";

export type ThemeColors = Record<ColorKey, ColorValue>;
export type Theme = Omit<typeof night, "colors"> & { colors: ThemeColors };

/**
 * Point d'acces unique au theme (ADR-0009). Mode jour ou nuit selon le reglage de l'iPhone
 * (ADR-0023) : chaque couleur est une paire jour/nuit resolue par iOS lui-meme, y compris
 * dans les styles crees une fois pour toutes. Android reste en mode nuit pour l'instant.
 */
const colors = Object.fromEntries(
  (Object.keys(night.colors) as ColorKey[]).map((key) => [
    key,
    Platform.OS === "ios"
      ? DynamicColorIOS({ light: lightColors[key], dark: night.colors[key] })
      : night.colors[key],
  ]),
) as ThemeColors;

export const theme: Theme = { ...night, colors };

/** Valeurs brutes par mode, pour les rares API qui exigent une chaine (flou, barre d'etat). */
export const palette = { dark: night.colors, light: lightColors } as const;

/** Familles Manrope chargees par expo-font ; les noms doivent correspondre a ceux du package de polices. */
export const fontFamily = {
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;
