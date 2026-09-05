import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

/** Etat vide standard : chaque ecran en a un (brief § 29). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <Text variant="h2" style={styles.center}>
        {title}
      </Text>
      {description ? (
        <Text variant="sm" tone="muted" style={styles.center}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
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
    paddingVertical: theme.space["7"],
  },
  center: { textAlign: "center" },
  action: { marginTop: theme.space["3"], alignSelf: "stretch" },
});
