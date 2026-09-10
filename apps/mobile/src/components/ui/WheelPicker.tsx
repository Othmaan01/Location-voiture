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
import { ChevronsUpDown } from "lucide-react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

const ITEM = 28;

/**
 * Petite roulette (retour fondateur, 2026-09-10) : une seule ligne, la valeur choisie, un cran
 * par valeur au glissement. Assez discrete pour tenir a cote d'un titre de section.
 */
export function WheelPicker({
  items,
  index,
  onChange,
  label,
  width = 76,
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
        <ScrollView
          ref={ref}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          nestedScrollEnabled
          contentOffset={{ x: 0, y: index * ITEM }}
          // Position initiale garantie une fois le contenu mesure (contentOffset seul est parfois ignore).
          onContentSizeChange={() =>
            ref.current?.scrollTo({ y: settled.current * ITEM, animated: false })
          }
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
        <ChevronsUpDown size={13} color={theme.colors.textDim} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 2 },
  flex: { flex: 1 },
  wheel: {
    height: ITEM,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  item: { height: ITEM, alignItems: "center", justifyContent: "center", paddingLeft: 4 },
});
