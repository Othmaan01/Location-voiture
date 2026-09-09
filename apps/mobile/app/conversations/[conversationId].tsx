import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SendHorizontal } from "lucide-react-native";

import { Button, EmptyState, Screen, Text } from "@/components/ui";
import { ReportSheet } from "@/features/reports/ReportSheet";
import { ApiRequestError } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { useConversation, useMarkRead, useSendMessage } from "@/lib/queries-messaging";
import { fontFamily, theme } from "@/theme";

/** Fil de discussion : bulles, saisie en bas, mise a jour toutes les 5 s, lecture marquee a l'ouverture. */
export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const me = useMe();
  const detail = useConversation(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const [text, setText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const count = detail.data?.messages.length ?? 0;
  const unread = detail.data?.conversation.unreadCount ?? 0;

  useEffect(() => {
    if (unread > 0) markRead.mutate();
    // Marque lu a chaque nouveau message recu pendant que le fil est ouvert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, unread]);

  if (detail.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState
          title="Conversation introuvable"
          action={<Button label="Retour" variant="ghost" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }
  const c = detail.data.conversation;
  const isCustomer = me.data?.userId === c.customerId;
  const title = isCustomer ? c.organizationName : c.customerName;
  const context = [c.vehicleLabel, c.bookingReference ? `Réf. ${c.bookingReference}` : null]
    .filter(Boolean)
    .join(" · ");

  const submit = () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    setText("");
    send.mutate(body, {
      onError: (e) => {
        setText(body);
        Alert.alert("Message non envoyé", e instanceof ApiRequestError ? e.message : "Réessayez.");
      },
    });
  };

  return (
    <Screen
      title={title}
      {...(context ? { eyebrow: context } : {})}
      back
      scroll={false}
      contentStyle={styles.content}
      headerRight={
        c.bookingId ? (
          <Button
            label="Réservation"
            variant="ghost"
            size="sm"
            onPress={() =>
              isCustomer
                ? router.push(`/reservations/${c.bookingId}`)
                : router.push(`/(pro)/organizations/${c.organizationId}/bookings/${c.bookingId}`)
            }
          />
        ) : isCustomer ? (
          <Button label="Signaler" variant="ghost" size="sm" onPress={() => setReportOpen(true)} />
        ) : undefined
      }
    >
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="conversation"
        targetId={c.id}
        label="cette conversation"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<View style={styles.topRule} />}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {detail.data.messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, m.mine ? styles.rowMine : null]}>
              <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text variant="sm" tone={m.mine ? "inverse" : "default"}>
                  {m.body}
                </Text>
                <Text variant="small" tone={m.mine ? "inverse" : "dim"} style={styles.time}>
                  {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}
          {detail.data.messages.length === 0 ? (
            <Text variant="sm" tone="muted" style={styles.empty}>
              Écrivez votre premier message.
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Votre message"
            placeholderTextColor={theme.colors.placeholder}
            multiline
            maxLength={2000}
            style={styles.input}
            accessibilityLabel="Votre message"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            style={[styles.send, !text.trim() ? styles.sendOff : null]}
          >
            {send.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <SendHorizontal size={20} color="#ffffff" strokeWidth={2.25} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 0 },
  flex: { flex: 1 },
  list: { gap: theme.space["2"], paddingBottom: theme.space["3"] },
  topRule: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.space["2"],
    marginBottom: theme.space["4"],
  },
  bubbleRow: { flexDirection: "row", justifyContent: "flex-start" },
  rowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: theme.space["3"],
    paddingVertical: theme.space["2"],
    borderRadius: 18,
    gap: 2,
  },
  bubbleMine: { backgroundColor: theme.colors.accent, borderBottomRightRadius: 6 },
  bubbleOther: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 6,
  },
  time: { alignSelf: "flex-end", opacity: 0.8 },
  empty: { textAlign: "center", marginTop: theme.space["6"] },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.space["2"],
    paddingTop: theme.space["2"],
    paddingBottom: theme.space["2"],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: theme.space["3"],
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.45 },
});
