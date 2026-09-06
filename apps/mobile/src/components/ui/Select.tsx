import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";

import { theme } from "@/theme";

import { Sheet } from "./Sheet";
import { Text } from "./Text";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string | undefined;
  placeholder?: string;
}

/** Selecteur en feuille basse : lisible au pouce, une option par ligne. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  placeholder = "Choisir",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrapper}>
      <Text variant="smStrong" tone="muted">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${current?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text variant="body" tone={current ? "default" : "dim"} style={styles.value}>
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={20} color={theme.colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger">
          {error}
        </Text>
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.options}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={[styles.option, selected ? styles.optionOn : null]}
              >
                <View style={styles.optionTexts}>
                  <Text variant="smStrong">{o.label}</Text>
                  {o.hint ? (
                    <Text variant="small" tone="muted">
                      {o.hint}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <Check size={18} color={theme.colors.accentTint} strokeWidth={2.5} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: theme.space["3"],
    gap: theme.space["2"],
  },
  fieldError: { borderColor: theme.colors.danger },
  value: { flex: 1 },
  options: { gap: theme.space["2"], maxHeight: 420 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    minHeight: 50,
    padding: theme.space["3"],
    borderRadius: theme.radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  optionOn: { borderColor: theme.colors.accent },
  optionTexts: { flex: 1, gap: 2 },
});
