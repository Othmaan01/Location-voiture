import { useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Signature } from "@lv/contracts";

import { Text } from "@/components/ui";
import { theme } from "@/theme";

/**
 * Signature au doigt (ADR-0018) : chaque trait est une suite de points relatifs (0 a 1),
 * pour que le PDF la retrace sans deformation. Pas de dependance native.
 */
export function SignaturePad({
  value,
  onChange,
  height = 160,
}: {
  value: Signature;
  onChange: (next: Signature) => void;
  height?: number;
}) {
  const [size, setSize] = useState({ w: 1, h: height });
  const sizeRef = useRef(size);
  const current = useRef<[number, number][]>([]);
  const [live, setLive] = useState<[number, number][]>([]);
  const valueRef = useRef(value);
  valueRef.current = value;

  const norm = (x: number, y: number): [number, number] => [
    Math.min(1, Math.max(0, x / sizeRef.current.w)),
    Math.min(1, Math.max(0, y / sizeRef.current.h)),
  ];
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        current.current = [norm(e.nativeEvent.locationX, e.nativeEvent.locationY)];
        setLive(current.current);
      },
      onPanResponderMove: (e) => {
        current.current = [
          ...current.current,
          norm(e.nativeEvent.locationX, e.nativeEvent.locationY),
        ];
        setLive(current.current);
      },
      onPanResponderRelease: () => {
        if (current.current.length > 0) onChange([...valueRef.current, current.current]);
        current.current = [];
        setLive([]);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    sizeRef.current = next;
    setSize(next);
  };
  const toPath = (stroke: [number, number][]) =>
    stroke
      .map(
        ([x, y], i) =>
          `${i === 0 ? "M" : "L"}${(x * size.w).toFixed(1)} ${(y * size.h).toFixed(1)}`,
      )
      .join(" ");

  return (
    <View style={styles.wrap}>
      <View style={[styles.pad, { height }]} onLayout={onLayout} {...responder.panHandlers}>
        <Svg width={size.w} height={size.h} pointerEvents="none">
          {[...value, live]
            .filter((s) => s.length > 0)
            .map((stroke, i) => (
              <Path
                key={i}
                d={toPath(stroke)}
                stroke={theme.colors.text}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
        </Svg>
        {value.length === 0 && live.length === 0 ? (
          <View style={styles.hint} pointerEvents="none">
            <Text variant="sm" tone="dim">
              Le client signe ici, au doigt
            </Text>
          </View>
        ) : null}
        <View style={styles.baseline} pointerEvents="none" />
      </View>
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange([])}
          hitSlop={8}
          style={styles.clear}
        >
          <Text variant="smStrong" tone="accent">
            Effacer
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space["2"] },
  pad: {
    width: "100%",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  hint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  baseline: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 28,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  clear: { alignSelf: "flex-end" },
});
