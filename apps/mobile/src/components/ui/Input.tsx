import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { fontFamily, theme } from "@/theme";

import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  hint?: string;
}

/** Champ de saisie : libelle au-dessus, erreur en dessous, bascule d'affichage pour les mots de passe. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, secureTextEntry, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.text
      : theme.colors.border;
  return (
    <View style={styles.wrapper}>
      <Text variant="smStrong" tone="muted">
        {label}
      </Text>
      <View style={[styles.field, { borderColor }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.placeholder}
          selectionColor={theme.colors.accent}
          secureTextEntry={secureTextEntry && !reveal}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
          style={[styles.input, style]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            onPress={() => setReveal((v) => !v)}
            hitSlop={8}
            style={styles.eye}
          >
            {reveal ? (
              <EyeOff size={20} color={theme.colors.textMuted} />
            ) : (
              <Eye size={20} color={theme.colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="dim">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.space["3"],
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: fontFamily.semibold,
    fontSize: theme.font.size.md,
    paddingVertical: 12,
  },
  eye: {
    width: theme.touch.minTarget,
    height: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
  },
});
