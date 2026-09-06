import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Calendar, MapPin, SlidersHorizontal } from "lucide-react-native";
import type { PublicVehicleCard } from "@lv/contracts";

import { Button, EmptyState, Screen, Select, Sheet, Text } from "@/components/ui";
import { CitySheet } from "@/features/client/CitySheet";
import { PeriodSheet } from "@/features/client/PeriodSheet";
import { VehicleActionSheet } from "@/features/client/VehicleActionSheet";
import { VehicleCard } from "@/features/client/VehicleCard";
import { formatPeriod, useSearchState } from "@/features/client/search-state";
import { CATEGORY_OPTIONS, FUEL_OPTIONS, TRANSMISSION_OPTIONS } from "@/features/pro/labels";
import {
  useFavorites,
  useSearch,
  useToggleFavorite,
  type SearchParams,
} from "@/lib/queries-public";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

type Sort = NonNullable<SearchParams["sort"]>;
const SORT_OPTIONS = [
  { value: "relevance" as Sort, label: "Pertinence" },
  { value: "price_asc" as Sort, label: "Prix croissant" },
  { value: "price_desc" as Sort, label: "Prix décroissant" },
  { value: "distance" as Sort, label: "Distance" },
];

/** Explorer : lieu + dates d'abord, puis resultats filtres par disponibilite reelle. */
export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { citySlug, cityName, origin, from, to, setCity, setOrigin, setPeriod } = useSearchState();
  const [sheet, setSheet] = useState<"city" | "period" | "filters" | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [transmission, setTransmission] = useState<string | null>(null);
  const [fuel, setFuel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("relevance");
  const [selected, setSelected] = useState<(PublicVehicleCard & { loueurName: string }) | null>(
    null,
  );
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const favSet = new Set(favorites.data?.vehicles.map((v) => v.id) ?? []);

  const hasPlace = !!citySlug || !!origin;
  const search = useSearch(
    {
      citySlug: citySlug ?? undefined,
      lat: origin?.lat,
      lng: origin?.lng,
      radiusKm: 30,
      from: from ?? undefined,
      to: to ?? undefined,
      categories: category ?? undefined,
      transmission: transmission ?? undefined,
      fuel: fuel ?? undefined,
      sort,
    },
    hasPlace,
  );
  const activeFilters = [category, transmission, fuel].filter(Boolean).length;

  return (
    <Screen title="Explorer" dock>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("city")}
          style={[styles.chip, styles.grow]}
        >
          <MapPin size={18} color={theme.colors.textMuted} />
          <Text variant="smStrong" numberOfLines={1}>
            {cityName ?? (origin ? "Autour de moi" : "Où ?")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("period")}
          style={[styles.chip, styles.grow]}
        >
          <Calendar size={18} color={theme.colors.textMuted} />
          <Text variant="smStrong" numberOfLines={1}>
            {formatPeriod(from, to)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtres"
          onPress={() => setSheet("filters")}
          style={[styles.chip, activeFilters > 0 ? styles.chipOn : null]}
        >
          <SlidersHorizontal size={18} color={theme.colors.text} />
          {activeFilters > 0 ? <Text variant="smStrong">{activeFilters}</Text> : null}
        </Pressable>
      </View>

      {!hasPlace ? (
        <EmptyState
          title="Où cherchez-vous ?"
          description="Choisissez une ville ou utilisez votre position, puis vos dates : chaque prix affiché sera un prix pour ces dates."
          action={<Button label="Choisir un lieu" onPress={() => setSheet("city")} />}
        />
      ) : null}
      {hasPlace && search.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {search.isError ? (
        <EmptyState
          title="Recherche impossible"
          description="Vérifiez votre connexion."
          action={
            <Button label="Réessayer" variant="ghost" onPress={() => void search.refetch()} />
          }
        />
      ) : null}
      {search.data ? (
        <>
          <Text variant="sm" tone="muted">
            {search.data.total} véhicule{search.data.total > 1 ? "s" : ""}{" "}
            {from && to
              ? "disponible" + (search.data.total > 1 ? "s" : "") + " à vos dates"
              : "dans un rayon de 30 km"}
          </Text>
          <View style={styles.grid}>
            {search.data.items.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onPress={() => router.push(`/loueurs/${v.loueurId}`)}
                onAction={() => setSelected(v)}
                favorite={favSet.has(v.id)}
                onToggleFavorite={() =>
                  session
                    ? toggle.mutate({ vehicleId: v.id, on: !favSet.has(v.id) })
                    : router.push("/(auth)/sign-in")
                }
              />
            ))}
          </View>
          {search.data.total === 0 ? (
            <EmptyState
              title="Aucun véhicule"
              description="Élargissez les dates ou changez de ville."
            />
          ) : null}
        </>
      ) : null}

      <CitySheet
        visible={sheet === "city"}
        onClose={() => setSheet(null)}
        onPickCity={(slug, name) => {
          setCity(slug, name);
          setOrigin(null);
          setSheet(null);
        }}
        onPickLocation={(o) => {
          setOrigin(o);
          setCity(null, null);
          setSheet(null);
        }}
      />
      <PeriodSheet
        visible={sheet === "period"}
        from={from}
        to={to}
        onClose={() => setSheet(null)}
        onApply={(f, t) => {
          setPeriod(f, t);
          setSheet(null);
        }}
      />
      <Sheet visible={sheet === "filters"} onClose={() => setSheet(null)} title="Filtres">
        <Select
          label="Catégorie"
          value={category}
          options={[{ value: "", label: "Toutes" }, ...CATEGORY_OPTIONS]}
          onChange={(v) => setCategory(v || null)}
          placeholder="Toutes"
        />
        <Select
          label="Boîte"
          value={transmission}
          options={[{ value: "", label: "Toutes" }, ...TRANSMISSION_OPTIONS]}
          onChange={(v) => setTransmission(v || null)}
          placeholder="Toutes"
        />
        <Select
          label="Énergie"
          value={fuel}
          options={[{ value: "", label: "Toutes" }, ...FUEL_OPTIONS]}
          onChange={(v) => setFuel(v || null)}
          placeholder="Toutes"
        />
        <Select label="Tri" value={sort} options={SORT_OPTIONS} onChange={setSort} />
        <Button label="Voir les résultats" onPress={() => setSheet(null)} />
      </Sheet>
      <VehicleActionSheet
        vehicle={selected}
        loueurName={selected?.loueurName ?? ""}
        phone={null}
        onClose={() => setSelected(null)}
        onRequest={() => {
          const v = selected;
          setSelected(null);
          if (v) router.push(`/vehicules/${v.id}/demande`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: theme.space["2"] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: theme.touch.minTarget,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: { borderColor: theme.colors.accent },
  grow: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space["3"],
  },
});
