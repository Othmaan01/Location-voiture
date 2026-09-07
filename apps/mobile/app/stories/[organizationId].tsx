import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Sparkles, Tag, X } from "lucide-react-native";
import type { StoryGroup, StoryItem } from "@lv/contracts";

import { Avatar, Badge, Button, Text } from "@/components/ui";
import { ACCENT_COLOR } from "@/features/client/accent";
import { formatOffer } from "@/lib/queries-offers";
import { seenKey, useSeenStories, useStories } from "@/lib/queries-stories";
import { theme } from "@/theme";

const DURATION_MS = 5000;

/**
 * Visionneuse de stories (ADR-0016) : plein ecran, barres de progression, avance automatique,
 * toucher a droite = suivant, a gauche = precedent, appui long = pause. Fin du loueur = loueur suivant.
 */
export default function StoryViewerScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const router = useRouter();
  const stories = useStories();
  const groups = useMemo(() => stories.data?.groups ?? [], [stories.data]);
  const startIndex = Math.max(
    0,
    groups.findIndex((g) => g.organizationId === organizationId),
  );
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const goNextGroup = () => {
    if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);
      setItemIndex(0);
    } else close();
  };
  const next = () => {
    if (group && itemIndex + 1 < group.items.length) setItemIndex(itemIndex + 1);
    else goNextGroup();
  };
  const prev = () => {
    if (itemIndex > 0) setItemIndex(itemIndex - 1);
    else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setItemIndex(0);
    }
  };

  if (!group || !item) {
    if (stories.isSuccess) close();
    return <View style={styles.root} />;
  }
  return (
    <Story
      key={`${group.organizationId}:${item.id}`}
      group={group}
      item={item}
      itemIndex={itemIndex}
      onNext={next}
      onPrev={prev}
      onClose={close}
      onOpenLoueur={() => {
        router.replace(`/loueurs/${group.organizationId}`);
      }}
    />
  );
}

function Story({
  group,
  item,
  itemIndex,
  onNext,
  onPrev,
  onClose,
  onOpenLoueur,
}: {
  group: StoryGroup;
  item: StoryItem;
  itemIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onOpenLoueur: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const markSeen = useSeenStories((s) => s.markSeen);
  const progress = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);
  const accent = ACCENT_COLOR[group.accent];

  useEffect(() => {
    markSeen(seenKey(group.organizationId, group.latestAt));
  }, [group.organizationId, group.latestAt, markSeen]);

  const value = useRef(0);
  useEffect(() => {
    const id = progress.addListener(({ value: v }) => {
      value.current = v;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  // Photo : minuteur anime. Video : la progression suit la lecture (voir VideoLayer).
  const isVideo = !!item.videoUrl;
  useEffect(() => {
    if (isVideo) return;
    if (paused) {
      progress.stopAnimation();
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS * (1 - value.current),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) onNext();
    });
    return () => anim.stop();
  }, [isVideo, paused, progress, onNext]);

  const badge =
    item.kind === "offer" && item.offer ? (
      <Badge
        label={formatOffer(item.offer)}
        tone="success"
        icon={<Tag size={12} color={theme.colors.success} strokeWidth={2.5} />}
      />
    ) : item.kind === "new_vehicle" ? (
      <Badge
        label="Nouveau"
        tone="accent"
        icon={<Sparkles size={12} color={theme.colors.accentTint} strokeWidth={2.5} />}
      />
    ) : null;

  return (
    <View style={styles.root}>
      {item.videoUrl ? (
        <VideoLayer uri={item.videoUrl} paused={paused} progress={progress} onEnd={onNext} />
      ) : item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]} />
      )}
      <View style={styles.shadeTop} />
      <View style={styles.shadeBottom} />

      <Pressable
        style={styles.leftZone}
        onPress={onPrev}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
      />
      <Pressable
        style={styles.rightZone}
        onPress={onNext}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
      />

      <View
        style={[styles.top, { paddingTop: insets.top + theme.space["2"] }]}
        pointerEvents="box-none"
      >
        <View style={styles.bars}>
          {group.items.map((it, i) => (
            <View key={it.id} style={styles.bar}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: "#ffffff",
                    width:
                      i < itemIndex
                        ? "100%"
                        : i === itemIndex
                          ? progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            })
                          : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.head}>
          <Pressable onPress={onOpenLoueur} style={styles.headLeft} accessibilityRole="button">
            <View style={[styles.avatarRing, { borderColor: accent }]}>
              <Avatar name={group.name} uri={group.logoUrl} size={34} round />
            </View>
            <Text variant="smStrong" style={styles.onImage} numberOfLines={1}>
              {group.name}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={onClose}
            hitSlop={12}
            style={styles.close}
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View
        style={[styles.bottom, { paddingBottom: insets.bottom + theme.space["4"], width }]}
        pointerEvents="box-none"
      >
        {badge ? <View style={styles.badgeRow}>{badge}</View> : null}
        <Text variant="display" style={styles.onImage} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text variant="body" style={styles.onImageMuted} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        <Button
          label={item.kind === "story" ? "Voir le loueur" : "Voir et réserver"}
          variant="primary"
          icon={<ChevronRight size={18} color={theme.colors.textInverse} />}
          onPress={onOpenLoueur}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

/** Lecture d'une story video : plein ecran, son actif, fin de lecture = story suivante. */
function VideoLayer({
  uri,
  paused,
  progress,
  onEnd,
}: {
  uri: string;
  paused: boolean;
  progress: Animated.Value;
  onEnd: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  useEffect(() => {
    if (paused) player.pause();
    else if (status === "readyToPlay") player.play();
  }, [paused, player, status]);
  useEffect(() => {
    const sub = player.addListener("playToEnd", onEnd);
    return () => sub.remove();
  }, [player, onEnd]);
  useEffect(() => {
    if (player.duration > 0) progress.setValue(Math.min(1, currentTime / player.duration));
  }, [currentTime, player, progress]);
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  shadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  shadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  leftZone: { position: "absolute", top: 120, bottom: 220, left: 0, width: "35%" },
  rightZone: { position: "absolute", top: 120, bottom: 220, right: 0, width: "65%" },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.space["3"],
    gap: theme.space["3"],
  },
  bars: { flexDirection: "row", gap: 4 },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  barFill: { height: "100%" },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space["3"],
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: theme.space["2"], flex: 1 },
  avatarRing: { padding: 2, borderWidth: 2, borderRadius: theme.radius.full },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    paddingHorizontal: theme.space["4"],
    gap: theme.space["2"],
  },
  badgeRow: { flexDirection: "row" },
  onImage: { color: "#ffffff" },
  onImageMuted: { color: "rgba(255,255,255,0.8)" },
  cta: { marginTop: theme.space["3"] },
});
