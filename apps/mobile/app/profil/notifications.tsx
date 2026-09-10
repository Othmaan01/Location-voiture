import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import type { Notification } from "@lv/contracts";

import { Button, Card, EmptyState, Screen, Text } from "@/components/ui";
import {
  readPushState,
  registerDeviceForPush,
  unregisterDeviceForPush,
  type PushState,
} from "@/lib/notifications";
import { useMarkNotificationsRead, useNotifications } from "@/lib/queries-notifications";
import { theme } from "@/theme";

/** Icone par famille de notification. */
function iconFor(kind: string): LucideIcon {
  if (kind.startsWith("message")) return MessageCircle;
  if (kind.startsWith("review")) return Star;
  if (kind.startsWith("subscription")) return CreditCard;
  if (kind.startsWith("booking")) return CalendarCheck;
  return Bell;
}

/** « il y a 5 min », « hier », sinon la date. */
function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Centre de notifications (retour, 2026-09-10) : un reglage clair pour ce telephone, puis la liste
 * de ce qui vous concerne. Tout est marque lu a l'ouverture ; toucher une ligne ouvre l'ecran vise.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [push, setPush] = useState<PushState>("off");
  const [busy, setBusy] = useState(false);
  const unread = list.data?.unreadCount ?? 0;

  useEffect(() => {
    void readPushState().then(setPush);
  }, []);
  useEffect(() => {
    if (unread > 0 && !markRead.isPending) markRead.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  const toggle = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) {
        const ok = await registerDeviceForPush(true);
        if (!ok) {
          Alert.alert(
            "Notifications désactivées sur ce téléphone",
            "Autorisez-les dans les réglages de l'iPhone pour être prévenu des réponses et des rappels.",
            [
              { text: "Plus tard", style: "cancel" },
              { text: "Ouvrir les réglages", onPress: () => void Linking.openSettings() },
            ],
          );
        }
      } else {
        await unregisterDeviceForPush();
      }
      setPush(await readPushState());
    } finally {
      setBusy(false);
    }
  };

  const open = (n: Notification) => {
    if (n.data["conversationId"]) router.push(`/conversations/${n.data["conversationId"]}`);
    else if (n.data["bookingId"]) router.push(`/reservations/${n.data["bookingId"]}`);
  };

  return (
    <Screen title="Notifications" back>
      <Card style={styles.setting}>
        <View style={styles.settingRow}>
          {push === "on" ? (
            <Bell size={22} color={theme.colors.text} />
          ) : (
            <BellOff size={22} color={theme.colors.textDim} />
          )}
          <View style={styles.flex}>
            <Text variant="bodyStrong">Sur ce téléphone</Text>
            <Text variant="small" tone="muted">
              {push === "on"
                ? "Réponses des loueurs, messages, rappels de retrait et de retour."
                : push === "denied"
                  ? "Refusées dans les réglages de l'iPhone."
                  : "Activez-les pour être prévenu sans ouvrir l'application."}
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Switch
              value={push === "on"}
              onValueChange={(v) => void toggle(v)}
              trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceHigh }}
              accessibilityLabel="Notifications sur ce téléphone"
            />
          )}
        </View>
        {push === "denied" ? (
          <Button
            label="Ouvrir les réglages de l'iPhone"
            variant="ghost"
            size="sm"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
      </Card>

      <Text variant="caps" tone="muted">
        Récentes
      </Text>
      {list.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {list.isError ? (
        <EmptyState
          title="Notifications indisponibles"
          description="Vérifiez votre connexion, puis réessayez."
          action={<Button label="Réessayer" variant="ghost" onPress={() => void list.refetch()} />}
        />
      ) : null}
      {list.data && list.data.notifications.length === 0 ? (
        <EmptyState
          title="Rien pour le moment"
          description="Vous verrez ici les réponses des loueurs, vos messages et vos rappels."
        />
      ) : null}
      {list.data && list.data.notifications.length > 0 ? (
        <Card padded={false}>
          {list.data.notifications.map((n, i) => {
            const Icon = iconFor(n.kind);
            const target = !!(n.data["conversationId"] || n.data["bookingId"]);
            return (
              <Pressable
                key={n.id}
                accessibilityRole={target ? "button" : "text"}
                onPress={target ? () => open(n) : undefined}
                style={({ pressed }) => [
                  styles.row,
                  i < list.data.notifications.length - 1 ? styles.rowBorder : null,
                  pressed && target ? styles.pressed : null,
                ]}
              >
                <View style={[styles.iconWrap, n.readAt ? null : styles.iconUnread]}>
                  <Icon
                    size={18}
                    color={n.readAt ? theme.colors.textMuted : theme.colors.accentTint}
                  />
                </View>
                <View style={styles.flex}>
                  <Text variant={n.readAt ? "sm" : "smStrong"} numberOfLines={2}>
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text variant="small" tone="muted" numberOfLines={2}>
                      {n.body}
                    </Text>
                  ) : null}
                </View>
                <Text variant="small" tone="dim">
                  {formatWhen(n.createdAt)}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  setting: { gap: theme.space["3"] },
  settingRow: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["3"],
    paddingVertical: theme.space["3"],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnread: { backgroundColor: theme.colors.accentSoft },
});
