import tokens from "../tokens.json" with { type: "json" };

/**
 * Design tokens partages (mobile, web).
 * Source de verite : tokens.json. Ce module ne fait qu'exposer des types
 * et un theme ; aucune valeur visuelle ne doit etre definie ailleurs.
 */
export const designTokens = tokens;
export type DesignTokens = typeof tokens;

export type InkShade = keyof DesignTokens["color"]["ink"];
export type SpaceKey = keyof DesignTokens["space"];
export type FontSizeKey = keyof DesignTokens["font"]["size"];

/** Poids de police typés en littéraux : React Native n'accepte pas `string`. */
export interface FontWeights {
  regular: "400";
  medium: "500";
  semibold: "600";
  bold: "700";
}
const fontWeight = tokens.font.weight as FontWeights;

/** Theme clair. Le theme sombre sera derive ici quand le fond de carte sombre sera choisi. */
export const lightTheme = {
  colors: {
    background: tokens.color.background,
    surface: tokens.color.surface,
    surfaceMuted: tokens.color.surfaceMuted,
    border: tokens.color.border,
    text: tokens.color.ink["900"],
    textMuted: tokens.color.ink["500"],
    textInverse: tokens.color.ink["50"],
    brand: tokens.color.brand.DEFAULT,
    brandDark: tokens.color.brand.dark,
    brandSoft: tokens.color.brand.soft,
    success: tokens.color.success,
    warning: tokens.color.warning,
    danger: tokens.color.danger,
  },
  space: tokens.space,
  radius: tokens.radius,
  font: { ...tokens.font, weight: fontWeight },
  touch: tokens.touch,
  motion: tokens.motion,
} as const;

export type Theme = typeof lightTheme;
