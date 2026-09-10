import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

import { fontFamily, theme } from "@/theme";

import { Text } from "./Text";

/**
 * Compteur discret (retour fondateur, 2026-09-10) : petite pastille rouge et chiffre blanc,
 * posee sur une icone (capsule) ou a cote d'un libelle (onglet). Rien au-dessus de 99.
 * `inverted` : sur un fond deja rouge (onglet actif), la pastille devient blanche.
 * `ring` : liseré de la couleur du fond, pour se detacher d'une icone.
 */
export function CountBadge({
  count,
  inverted = false,
  ring,
  style,
}: {
  count: number;
  inverted?: boolean;
  ring?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <View
      accessibilityLabel={`${count} non lu${count > 1 ? "s" : ""}`}
      style={[
        styles.pill,
        inverted ? styles.pillInverted : null,
        ring ? { borderWidth: 2, borderColor: ring } : null,
        style,
      ]}
    >
      <Text style={[styles.label, inverted ? styles.labelInverted : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pillInverted: { backgroundColor: "#ffffff" },
  label: {
    color: "#ffffff",
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 13,
    includeFontPadding: false,
  },
  labelInverted: { color: theme.colors.accent },
});
