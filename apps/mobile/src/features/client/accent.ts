import type { ColorValue } from "react-native";
import type { Accent } from "@lv/contracts";

import { theme } from "@/theme";

/** Couleurs d'accent des loueurs (ADR-0011) : la meme palette fermee que dans l'ecran Apparence. */
export const ACCENT_COLOR: Record<Accent, ColorValue> = {
  red: theme.colors.accent,
  gold: "#d9a441",
  blue: "#3b82f6",
  green: "#22c55e",
};
