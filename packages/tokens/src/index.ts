import tokens from "../tokens.json" with { type: "json" };

/**
 * Design tokens partages (mobile, web). Source de verite : tokens.json (ADR-0009).
 * Le mode nuit est la reference ; `color.light` en est la contrepartie jour (ADR-0023),
 * appliquee par l'application selon le reglage de l'appareil. Aucune valeur visuelle ailleurs.
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
export type ColorKey = keyof Theme["colors"];

/** Palette jour : les memes cles que le mode nuit, valeurs de `color.light`. */
const light = tokens.color.light;
export const lightColors: Record<ColorKey, string> = {
  background: light.ground["1"],
  backgroundDeep: light.ground["0"],
  surface: light.ground["2"],
  surfaceRaised: light.ground["3"],
  surfaceHigh: light.ground["4"],
  border: light.ground["5"],
  text: light.text.primary,
  textMuted: light.text.muted,
  textDim: light.text.dim,
  textInverse: light.text.inverse,
  placeholder: light.text.placeholder,
  accent: light.red.DEFAULT,
  accentDark: light.red.dark,
  accentTint: light.red.tint,
  accentSoft: light.red.soft,
  success: light.success.DEFAULT,
  successSoft: light.success.soft,
  warning: light.warning.DEFAULT,
  warningSoft: light.warning.soft,
  danger: light.danger.DEFAULT,
  dangerSoft: light.danger.soft,
  overlay: light.overlay,
  glass: light.glass,
  glassBorder: light.glassBorder,
};

export const lightTheme = { ...theme, colors: lightColors };
