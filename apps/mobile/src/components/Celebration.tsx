import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { Text } from "@/components/ui";
import { useCelebration } from "@/lib/celebrate";
import { theme } from "@/theme";

const HOLD_MS = 1700;
const RING = 92;
const STROKE = 3;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Moment de reussite (D9) : une carte de verre, un anneau rouge qui se trace, une coche qui
 * surgit, un halo discret. Sobre, dans la DA nuit. Disparait seul, ou au toucher.
 */
export function Celebration() {
  const current = useCelebration((s) => s.current);
  if (!current) return null;
  return <Moment key={current.key} title={current.title} subtitle={current.subtitle} />;
}

function Moment({ title, subtitle }: { title: string; subtitle?: string }) {
  const hide = useCelebration((s) => s.hide);
  const veil = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      Animated.parallel([
        Animated.timing(veil, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(card, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => hide());
    };
    Animated.sequence([
      Animated.parallel([
        Animated.timing(veil, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(card, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }),
      ]),
      Animated.timing(ring, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.spring(check, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(halo, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(text, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]).start(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    const timer = setTimeout(close, HOLD_MS + 900);
    return () => clearTimeout(timer);
  }, [veil, card, ring, check, halo, text, hide]);

  const dismiss = () =>
    Animated.parallel([
      Animated.timing(veil, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(card, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => hide());

  return (
    <Animated.View style={[styles.root, { opacity: veil }]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Fermer" />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: card,
            transform: [
              { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.ringBox}>
          <Animated.View
            style={[
              styles.halo,
              {
                opacity: halo.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.35, 0] }),
                transform: [
                  { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) },
                ],
              },
            ]}
          />
          <Svg width={RING} height={RING} style={styles.ring}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={theme.colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={theme.colors.accent}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={ring.interpolate({
                inputRange: [0, 1],
                outputRange: [CIRCUMFERENCE, 0],
              })}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <Animated.View
            style={[
              styles.check,
              {
                opacity: check,
                transform: [
                  { scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                ],
              },
            ]}
          >
            <Check size={34} color={theme.colors.text} strokeWidth={2.75} />
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.texts,
            {
              opacity: text,
              transform: [
                { translateY: text.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
              ],
            },
          ]}
        >
          <Text variant="h1" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    width: 300,
    paddingVertical: theme.space["7"],
    paddingHorizontal: theme.space["5"],
    borderRadius: 28,
    backgroundColor: "rgba(22,22,26,0.96)",
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    alignItems: "center",
    gap: theme.space["5"],
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  ringBox: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute" },
  halo: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: theme.colors.accent,
  },
  check: { alignItems: "center", justifyContent: "center" },
  texts: { alignItems: "center", gap: 6 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
});
