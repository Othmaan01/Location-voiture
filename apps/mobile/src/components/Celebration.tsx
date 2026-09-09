import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";

import { Text } from "@/components/ui";
import { useCelebration } from "@/lib/celebrate";
import { theme } from "@/theme";

const DURATION_MS = 1900;
const PARTICLES = 18;
const COLORS = [
  theme.colors.accent,
  theme.colors.accentTint,
  "#d9a441",
  "#3b82f6",
  "#22c55e",
  "#ffffff",
];

/** Superposition de reussite : pastille qui surgit, confettis, retour haptique, disparait seule. */
export function Celebration() {
  const current = useCelebration((s) => s.current);
  if (!current) return null;
  return <Burst key={current.key} title={current.title} subtitle={current.subtitle} />;
}

function Burst({ title, subtitle }: { title: string; subtitle?: string }) {
  const hide = useCelebration((s) => s.hide);
  const backdrop = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2) * 0.2;
        const distance = 110 + (i % 3) * 34;
        return {
          color: COLORS[i % COLORS.length]!,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 6 + (i % 3) * 3,
          round: i % 2 === 0,
        };
      }),
    [],
  );

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(badge, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(burst, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        hide(),
      );
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [backdrop, badge, burst, hide]);

  return (
    <Animated.View style={[styles.root, { opacity: backdrop }]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityLabel="Fermer" />
      <View style={styles.center} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: p.size,
                height: p.round ? p.size : p.size * 2,
                borderRadius: p.round ? p.size / 2 : 2,
                backgroundColor: p.color,
                opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                  {
                    translateY: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, p.y + 40],
                    }),
                  },
                  {
                    rotate: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", `${(i % 2 ? 1 : -1) * 260}deg`],
                    }),
                  },
                  {
                    scale: burst.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.badge,
            {
              transform: [
                { scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            },
          ]}
        >
          <Check size={40} color="#ffffff" strokeWidth={3} />
        </Animated.View>
        <Animated.View style={[styles.texts, { opacity: badge }]}>
          <Text variant="h1" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
      </View>
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
    backgroundColor: "rgba(8,8,10,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  center: { alignItems: "center", justifyContent: "center", gap: theme.space["4"] },
  particle: { position: "absolute" },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  texts: { alignItems: "center", gap: 6, paddingHorizontal: theme.space["6"] },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
});
