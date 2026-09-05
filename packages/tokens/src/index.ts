import tokens from "../tokens.json" with { type: "json" };

/**
 * Design tokens partages (mobile, web). Source de verite : tokens.json (ADR-0009).
 * Mode nuit uniquement. Aucune valeur visuelle ne doit etre definie ailleurs.
 */
export const designTokens = tokens;
export type DesignTokens = typeof tokens;

export type SpaceKey = keyof DesignTokens["space"];
export type FontSizeKey = keyof DesignTokens["font"]["size"];

/** Poids de police en litteraux : React Native n'accepte pas `string`. */
export interface FontWeights {
  medium: "500";
  semibold: "600";
  bold: "700";
  extrabold: "800";
}
const fontWeight = tokens.font.weight as FontWeights;

export const theme = {
  colors: {
    background: tokens.color.black["1"],
    backgroundDeep: tokens.color.black["0"],
    surface: tokens.color.black["2"],
    surfaceRaised: tokens.color.black["3"],
    surfaceHigh: tokens.color.black["4"],
    border: tokens.color.black["5"],
    text: tokens.color.text.primary,
    textMuted: tokens.color.text.muted,
    textDim: tokens.color.text.dim,
    textInverse: tokens.color.text.inverse,
    placeholder: tokens.color.text.placeholder,
    accent: tokens.color.red.DEFAULT,
    accentDark: tokens.color.red.dark,
    accentTint: tokens.color.red.tint,
    accentSoft: tokens.color.red.soft,
    success: tokens.color.success.DEFAULT,
    successSoft: tokens.color.success.soft,
    warning: tokens.color.warning.DEFAULT,
    warningSoft: tokens.color.warning.soft,
    danger: tokens.color.danger.DEFAULT,
    dangerSoft: tokens.color.danger.soft,
    overlay: tokens.color.overlay,
    glass: tokens.color.glass,
    glassBorder: tokens.color.glassBorder,
  },
  space: tokens.space,
  radius: tokens.radius,
  font: { ...tokens.font, weight: fontWeight },
  shadow: tokens.shadow,
  touch: tokens.touch,
  dock: tokens.dock,
  motion: tokens.motion,
} as const;

export type Theme = typeof theme;

/** Conserve pour compatibilite ; le theme est unique (nuit). */
export const lightTheme = theme;
