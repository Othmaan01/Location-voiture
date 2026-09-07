import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Search } from "lucide-react-native";
import * as Location from "expo-location";
import type { FeedTab } from "@lv/contracts";

import { Button, EmptyState, Screen, Text } from "@/components/ui";
import { LoueurCard } from "@/features/client/LoueurCard";
import { useSearchState } from "@/features/client/search-state";
import { useFeed } from "@/lib/queries-public";
import { theme } from "@/theme";

/** Onglets masques au lancement (voitures uniquement) ; le moteur sert toujours "utility". */
const HIDDEN_TABS: ReadonlySet<FeedTab> = new Set<FeedTab>(["utility"]);
const TABS: { key: FeedTab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "offers", label: "Offres" },
  { key: "nearby", label: "Près de moi" },
  { key: "premium", label: "Premium" },
  { key: "utility", label: "Utilitaires" },
  { key: "new", label: "Nouveaux" },
].filter((t) => !HIDDEN_TABS.has(t.key as FeedTab)) as { key: FeedTab; label: string }[];

/** Accueil = feed des loueurs avec onglets (ADR-0009). */
export default function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>("all");
  const { origin, setOrigin, cityName } = useSearchState();
  const [locating, setLocating] = useState(false);
  const feed = useFeed(tab, origin);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const selectTab = async (next: FeedTab) => {
    setTab(next);
    if (next === "nearby" && !origin) {
      setLocating(true);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } finally {
        setLocating(false);
      }
    }
  };

  return (
    <Screen
      eyebrow={cityName ?? (origin ? "Autour de vous" : "France")}
      title="Loueurs"
      dock
      scroll={false}
      contentStyle={styles.content}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rechercher"
          onPress={() => router.push("/(tabs)/explorer")}
          style={styles.round}
        >
          <Search size={20} color={theme.colors.text} />
        </Pressable>
      }
    >
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
              onPress={() => void selectTab(t.key)}
              style={[styles.tab, tab === t.key ? styles.tabOn : null]}
            >
              <Text variant="smStrong" tone={tab === t.key ? "default" : "dim"}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => void feed.refetch()}
            tintColor={theme.colors.accent}
          />
        }
        onScroll={({ nativeEvent }) => {
          const nearEnd =
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 400;
          if (nearEnd && feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        scrollEventThrottle={200}
      >
        {feed.isPending || locating ? (
          <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
        ) : null}
        {feed.isError ? (
          <EmptyState
            title="Impossible de charger les loueurs"
            description="Vérifiez votre connexion."
            action={
              <Button label="Réessayer" variant="ghost" onPress={() => void feed.refetch()} />
            }
          />
        ) : null}
        {tab === "nearby" && !origin && !locating ? (
          <EmptyState
            title="Position non disponible"
            description="Autorisez la localisation ou choisissez une ville dans Explorer."
          />
        ) : null}
        {feed.data && items.length === 0 && !(tab === "nearby" && !origin) ? (
          <EmptyState
            title="Aucun loueur pour l'instant"
            description={
              tab === "all"
                ? "Les premiers loueurs vérifiés apparaîtront ici."
                : tab === "offers"
                  ? "Aucune offre en cours pour le moment. Revenez bientôt."
                  : "Essayez un autre onglet."
            }
          />
        ) : null}
        {items.map((l) => (
          <LoueurCard key={l.id} loueur={l} onPress={() => router.push(`/loueurs/${l.id}`)} />
        ))}
        {feed.isFetchingNextPage ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space["3"] },
  round: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { gap: theme.space["4"], paddingRight: theme.space["4"] },
  tab: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minHeight: theme.touch.minTarget,
    justifyContent: "flex-end",
  },
  tabOn: { borderBottomColor: theme.colors.accent },
  list: {
    gap: theme.space["3"],
    paddingBottom: theme.dock.height + theme.dock.bottom + theme.space["5"],
  },
  spinner: { marginTop: theme.space["5"] },
});
