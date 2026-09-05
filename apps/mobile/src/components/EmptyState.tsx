import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Etat vide standard : chaque ecran en a un (brief § 29). */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space["2"],
    paddingHorizontal: theme.space["5"],
  },
  title: {
    fontSize: theme.font.size.lg,
    lineHeight: theme.font.lineHeight.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: theme.font.size.md,
    lineHeight: theme.font.lineHeight.md,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
