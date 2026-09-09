import { useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { CAR_SKETCH, type Damage } from "@lv/contracts";

import { theme } from "@/theme";

/**
 * Croquis generique vue de dessus (ADR-0018) : on touche l'endroit du dommage, un repere numerote
 * apparait. Les positions sont relatives (0 a 1) : le PDF les redessine a l'identique.
 */
export function CarSketch({
  damages,
  onAdd,
  onSelect,
  height = 340,
}: {
  damages: Damage[];
  onAdd: (point: { x: number; y: number }) => void;
  onSelect?: (index: number) => void;
  height?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: height });
  const scale = Math.min(size.w / CAR_SKETCH.width, size.h / CAR_SKETCH.height) || 0;
  const drawW = CAR_SKETCH.width * scale;
  const drawH = CAR_SKETCH.height * scale;
  const offsetX = (size.w - drawW) / 2;
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={[styles.box, { height }]} onLayout={onLayout}>
      {scale > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Croquis du véhicule : touchez l'endroit d'un dommage"
          onPress={(e) => {
            const x = (e.nativeEvent.locationX - offsetX) / drawW;
            const y = e.nativeEvent.locationY / drawH;
            if (x < 0 || x > 1 || y < 0 || y > 1) return;
            onAdd({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
          }}
          style={StyleSheet.absoluteFill}
        >
          <Svg width={size.w} height={size.h}>
            {CAR_SKETCH.paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                transform={`translate(${offsetX} 0) scale(${scale})`}
                stroke={theme.colors.textMuted}
                strokeWidth={1.6 / scale}
                fill={i === 0 ? theme.colors.surfaceRaised : "none"}
                strokeLinejoin="round"
              />
            ))}
            {CAR_SKETCH.labels.map((l) => (
              <SvgText
                key={l.text}
                x={offsetX + l.x * drawW}
                y={l.y > 0.5 ? l.y * drawH + 10 : l.y * drawH + 2}
                fontSize={9}
                fontWeight="700"
                fill={theme.colors.textDim}
                textAnchor="middle"
              >
                {l.text}
              </SvgText>
            ))}
            {damages.map((d, i) => (
              <Circle
                key={i}
                cx={offsetX + d.x * drawW}
                cy={d.y * drawH}
                r={11}
                fill={theme.colors.accent}
                stroke={theme.colors.background}
                strokeWidth={2}
                onPress={onSelect ? () => onSelect(i) : undefined}
              />
            ))}
            {damages.map((d, i) => (
              <SvgText
                key={`n${i}`}
                x={offsetX + d.x * drawW}
                y={d.y * drawH + 4}
                fontSize={11}
                fontWeight="800"
                fill="#ffffff"
                textAnchor="middle"
              >
                {i + 1}
              </SvgText>
            ))}
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
});
