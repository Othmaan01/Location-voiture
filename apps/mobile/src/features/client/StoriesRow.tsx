import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { StoryGroup } from "@lv/contracts";

import { Avatar, Text } from "@/components/ui";
import { ACCENT_COLOR } from "@/features/client/accent";
import { seenKey, useSeenStories, useStories } from "@/lib/queries-stories";
import { theme } from "@/theme";

const SIZE = 46;

/** Bulles « du neuf chez les loueurs » sous les onglets du feed (ADR-0016). Invisible s'il n'y a rien. */
export function StoriesRow() {
  const stories = useStories();
  const groups = stories.data?.groups ?? [];
  if (groups.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {groups.map((g) => (
        <Bubble key={g.organizationId} group={g} />
      ))}
    </ScrollView>
  );
}

function Bubble({ group }: { group: StoryGroup }) {
  const router = useRouter();
  const seen = useSeenStories((s) => s.seen[seenKey(group.organizationId, group.latestAt)]);
  const ring = seen ? theme.colors.border : ACCENT_COLOR[group.accent];
  const hint =
    group.highlight === "offer" ? "Offre" : group.highlight === "story" ? "Story" : "Nouveau";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${hint}`}
      onPress={() => router.push(`/stories/${group.organizationId}`)}
      style={({ pressed }) => [styles.bubble, pressed ? styles.pressed : null]}
    >
      <View style={[styles.ring, { borderColor: ring }]}>
        <Avatar name={group.name} uri={group.logoUrl} size={SIZE} round />
      </View>
      {!seen ? (
        <View style={[styles.pill, { backgroundColor: ring }]}>
          <Text style={styles.pillText}>{hint}</Text>
        </View>
      ) : null}
      <Text variant="small" tone={seen ? "dim" : "default"} numberOfLines={1} style={styles.name}>
        {group.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -theme.space["4"], flexGrow: 0 },
  row: { gap: theme.space["2"], paddingHorizontal: theme.space["4"], paddingVertical: 2 },
  bubble: { width: SIZE + 16, alignItems: "center", gap: 4 },
  pressed: { opacity: 0.85 },
  ring: {
    padding: 2,
    borderWidth: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
  },
  pill: {
    position: "absolute",
    top: SIZE - 6,
    paddingHorizontal: 5,
    paddingVertical: 0,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  pillText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  name: { maxWidth: SIZE + 16, textAlign: "center", marginTop: 2, fontSize: 11, lineHeight: 14 },
});
