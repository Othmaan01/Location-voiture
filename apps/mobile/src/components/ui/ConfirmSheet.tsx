import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";

import { theme } from "@/theme";

import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

/**
 * Confirmation propre (retour fondateur) : une feuille depuis le bas, dans la DA, a la place
 * de l'alerte systeme. Le bouton qui engage est en bas, le bouton pour rester est discret.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Non, je garde",
  secondaryLabel,
  onSecondary,
  destructive = true,
  loading = false,
  icon,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Troisieme voie, entre confirmer et annuler (ex. « Faire l'etat des lieux ici »). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructive?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={[styles.iconBox, destructive ? styles.iconDanger : styles.iconNeutral]}>
          {icon ?? (
            <TriangleAlert
              size={26}
              color={destructive ? theme.colors.danger : theme.colors.text}
              strokeWidth={2.25}
            />
          )}
        </View>
        <Text variant="h2" style={styles.center}>
          {title}
        </Text>
        {message ? (
          <Text variant="body" tone="muted" style={styles.center}>
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={confirmLabel}
            variant={destructive ? "danger" : "accent"}
            loading={loading}
            onPress={onConfirm}
          />
          {secondaryLabel && onSecondary ? (
            <Button label={secondaryLabel} variant="primary" onPress={onSecondary} />
          ) : null}
          <Button label={cancelLabel} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", gap: theme.space["3"], paddingTop: theme.space["2"] },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space["1"],
  },
  iconDanger: { backgroundColor: theme.colors.dangerSoft },
  iconNeutral: { backgroundColor: theme.colors.surfaceRaised },
  center: { textAlign: "center" },
  actions: { alignSelf: "stretch", gap: theme.space["2"], marginTop: theme.space["2"] },
});
