import { useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as Haptics from "expo-haptics";

import { theme } from "@/theme";

import { Text } from "./Text";

const ITEM = 26;
const VISIBLE = 3;

/**
 * Petite roulette (retour fondateur, 2026-09-10) : trois lignes visibles, la valeur au centre,
 * un cran par valeur. Assez discrete pour tenir a cote d'un titre de section.
 */
export function WheelPicker({
  items,
  index,
  onChange,
  label,
  width = 68,
}: {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  label?: string;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const settled = useRef(index);

  useEffect(() => {
    if (settled.current === index) return;
    settled.current = index;
    ref.current?.scrollTo({ y: index * ITEM, animated: true });
  }, [index]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(
      items.length - 1,
      Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM)),
    );
    if (i === settled.current) return;
    settled.current = i;
    void Haptics.selectionAsync();
    onChange(i);
  };

  return (
    <View style={[styles.wrap, { width }]}>
      {label ? (
        <Text variant="small" tone="dim">
          {label}
        </Text>
      ) : null}
      <View style={styles.wheel}>
        <View pointerEvents="none" style={styles.band} />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          nestedScrollEnabled
          contentOffset={{ x: 0, y: index * ITEM }}
          contentContainerStyle={styles.content}
          onMomentumScrollEnd={settle}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: items[index] }}
        >
          {items.map((item, i) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => ref.current?.scrollTo({ y: i * ITEM, animated: true })}
              style={styles.item}
            >
              <Text variant="smStrong" tone={i === index ? "default" : "dim"}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View pointerEvents="none" style={[styles.fade, styles.fadeTop]} />
        <View pointerEvents="none" style={[styles.fade, styles.fadeBottom]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 2 },
  wheel: {
    height: ITEM * VISIBLE,
    alignSelf: "stretch",
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  band: {
    position: "absolute",
    left: 4,
    right: 4,
    top: ITEM,
    height: ITEM,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHigh,
  },
  content: { paddingVertical: ITEM },
  item: { height: ITEM, alignItems: "center", justifyContent: "center" },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM,
    backgroundColor: theme.colors.surfaceRaised,
    opacity: 0.55,
  },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
});
