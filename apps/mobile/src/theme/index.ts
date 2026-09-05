import { theme as tokens, type Theme } from "@lv/tokens";

/** Point d'acces unique au theme (mode nuit, ADR-0009). Aucune couleur ou taille en dur ailleurs. */
export const theme: Theme = tokens;

/** Familles Manrope chargees par expo-font ; les noms doivent correspondre a ceux du package de polices. */
export const fontFamily = {
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;
