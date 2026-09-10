import { StyleSheet, View, type ViewProps } from "react-native";

import { theme } from "@/theme";

export interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
  /** Sans ombre (cartes imbriquees dans une autre carte). */
  flat?: boolean;
}

/**
 * Carte du design system. Deux couches (retour fondateur, 2026-09-10 : « plus de relief ») :
 * l'exterieure porte l'ombre douce, l'interieure coupe les coins (photos, listes) ; `style`
 * s'applique a l'interieure (marges internes, espacement, couleur de bord).
 */
export function Card({ padded = true, raised = false, flat = false, style, ...rest }: CardProps) {
  return (
    <View style={[styles.shadow, flat || raised ? styles.noShadow : null]}>
      <View
        {...rest}
        style={[styles.card, raised ? styles.raised : null, padded ? styles.padded : null, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.shadow.lift.color,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  noShadow: { shadowOpacity: 0, elevation: 0 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  raised: { backgroundColor: theme.colors.surfaceRaised },
  padded: { padding: theme.space["4"] },
});
