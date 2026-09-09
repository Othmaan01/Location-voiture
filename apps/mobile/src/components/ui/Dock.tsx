import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import {
  Building2,
  CalendarDays,
  Car,
  Eye,
  Flag,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  MessageCircle,
  Search,
  ShieldCheck,
  User,
} from "lucide-react-native";

import { MODE_TABS, useMode } from "@/lib/mode";
import { useUnread } from "@/lib/queries-messaging";
import { theme } from "@/theme";

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  explorer: Search,
  locations: Car,
  favoris: Heart,
  profil: User,
  "pro-home": LayoutDashboard,
  "pro-bookings": Inbox,
  "pro-vehicles": Car,
  "pro-calendar": CalendarDays,
  "pro-showcase": Eye,
  messages: MessageCircle,
  "pro-messages": MessageCircle,
  "admin-verifications": ShieldCheck,
  "admin-loueurs": Building2,
  "admin-reports": Flag,
};

/**
 * Barre d'onglets en capsule flottante (ADR-0009) : detachee des bords, translucide,
 * toujours visible ; l'onglet actif est une pastille rouge. Icones seules, libelles accessibles.
 */
/** Props de la barre telles que fournies par expo-router (evite un doublon de @react-navigation/bottom-tabs). */
type DockProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export function Dock({ state, descriptors, navigation }: DockProps) {
  const mode = useMode((s) => s.mode);
  const allowed = MODE_TABS[mode];
  const unread = useUnread();
  const unreadOrg = Object.values(unread.data?.organizations ?? {}).reduce((a, b) => a + b, 0);
  const dotFor = (name: string) =>
    (name === "messages" && (unread.data?.customer ?? 0) > 0) ||
    (name === "pro-messages" && unreadOrg > 0);
  const content = (
    <View style={styles.items}>
      {state.routes.map((route, index) => {
        if (!allowed.includes(route.name)) return null;
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;
        const label = descriptors[route.key]?.options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                void Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            }}
            style={[styles.item, focused ? styles.itemActive : null]}
          >
            <Icon
              size={24}
              color={focused ? "#ffffff" : theme.colors.textDim}
              strokeWidth={focused ? 2.25 : 1.75}
            />
            {dotFor(route.name) ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="dark" style={styles.capsule}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.capsule, styles.capsuleSolid]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: theme.dock.inset,
    right: theme.dock.inset,
    bottom: theme.dock.bottom,
  },
  capsule: {
    height: theme.dock.height,
    borderRadius: theme.radius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.glass,
    shadowColor: theme.shadow.lift.color,
    shadowOpacity: theme.shadow.lift.opacity,
    shadowRadius: theme.shadow.lift.radius,
    shadowOffset: { width: 0, height: theme.shadow.lift.offsetY },
    elevation: 12,
  },
  capsuleSolid: { backgroundColor: "rgba(22,22,26,0.94)" },
  items: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  item: {
    width: theme.dock.item,
    height: theme.dock.item,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentTint,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  itemActive: {
    backgroundColor: theme.colors.accent,
    shadowColor: theme.shadow.red.color,
    shadowOpacity: theme.shadow.red.opacity,
    shadowRadius: theme.shadow.red.radius,
    shadowOffset: { width: 0, height: theme.shadow.red.offsetY },
  },
});
