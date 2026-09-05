import { StyleSheet, View, type ViewProps } from "react-native";

import { theme } from "@/theme";

export interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
}

export function Card({ padded = true, raised = false, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[styles.card, raised ? styles.raised : null, padded ? styles.padded : null, style]}
    />
  );
}

const styles = StyleSheet.create({
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
