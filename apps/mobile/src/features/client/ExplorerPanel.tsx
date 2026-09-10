import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Calendar, MapPin, Search, SlidersHorizontal, X } from "lucide-react-native";
import type { PublicVehicleCard } from "@lv/contracts";

import { Button, CountBadge, EmptyState, Select, Sheet, Text } from "@/components/ui";
import { CitySheet } from "@/features/client/CitySheet";
import { PeriodSheet } from "@/features/client/PeriodSheet";
import { VehicleActionSheet } from "@/features/client/VehicleActionSheet";
import { VehicleCard } from "@/features/client/VehicleCard";
import { formatPeriod, useSearchState } from "@/features/client/search-state";
import { ContactSheet } from "@/features/messaging/ContactSheet";
import {
  ENABLED_CATEGORY_OPTIONS,
  FUEL_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "@/features/pro/labels";
import { useSearch, type SearchParams } from "@/lib/queries-public";
import { useFavoriteAction } from "@/features/client/favorites";
import { useSession } from "@/lib/session";
import { fontFamily, theme } from "@/theme";

type Sort = NonNullable<SearchParams["sort"]>;
const SORT_OPTIONS = [
  { value: "relevance" as Sort, label: "Pertinence" },
  { value: "price_asc" as Sort, label: "Prix croissant" },
  { value: "price_desc" as Sort, label: "Prix décroissant" },
  { value: "distance" as Sort, label: "Distance" },
];

/**
 * Recherche de vehicules (retour fondateur, 2026-09-10) : la loupe, le lieu, les dates et les
 * filtres vivent sur la meme page que le fil des loueurs (onglet « Tous »). Des qu'une recherche
 * est active, les resultats remplacent le fil ; `onActiveChange` previent le parent.
 */
export function ExplorerPanel({
  embedded = false,
  onActiveChange,
}: {
  /** Dans l'accueil : pas d'ecran vide « Ou cherchez-vous ? », le fil prend le relais. */
  embedded?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const router = useRouter();
  const { session } = useSession();
  const { citySlug, cityName, origin, from, to, setCity, setOrigin, setPeriod } = useSearchState();
  const [sheet, setSheet] = useState<"city" | "period" | "filters" | null>(null);
  const [contact, setContact] = useState<{
    organizationId: string;
    name: string;
    vehicleId: string;
  } | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [transmission, setTransmission] = useState<string | null>(null);
  const [fuel, setFuel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("relevance");
  const [selected, setSelected] = useState<
    (PublicVehicleCard & { loueurName: string; loueurId: string }) | null
  >(null);
  const fav = useFavoriteAction();

  const hasPlace = !!citySlug || !!origin;
  // Loupe : marque ou modele, envoye au moteur apres une courte pause de frappe.
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const canSearch = hasPlace || q.length >= 2;
  useEffect(() => {
    onActiveChange?.(canSearch);
  }, [canSearch, onActiveChange]);
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
      q: q.length >= 2 ? q : undefined,
    },
    canSearch,
  );
  const activeFilters = [category, transmission, fuel].filter(Boolean).length;

  return (
    <View style={styles.panel}>
      <View style={styles.search}>
        <Search size={18} color={theme.colors.textDim} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Marque ou modèle : Clio, Tesla, Classe A…"
          placeholderTextColor={theme.colors.placeholder}
          style={styles.searchInput}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher une marque ou un modèle"
        />
        {text ? (
          <Pressable
            onPress={() => setText("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Effacer"
          >
            <X size={16} color={theme.colors.textDim} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("city")}
          style={[styles.chip, styles.place]}
        >
          <MapPin size={18} color={theme.colors.textMuted} />
          <Text variant="smStrong" numberOfLines={1} style={styles.chipText}>
            {cityName ?? (origin ? "Autour de moi" : "Où ?")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("period")}
          style={[styles.chip, styles.dates]}
        >
          <Calendar size={18} color={theme.colors.textMuted} />
          <Text
            variant="smStrong"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={styles.chipText}
          >
            {formatPeriod(from, to)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtres"
          onPress={() => setSheet("filters")}
          style={[styles.chip, styles.filters, activeFilters > 0 ? styles.chipOn : null]}
        >
          <SlidersHorizontal size={18} color={theme.colors.text} />
          <CountBadge count={activeFilters} style={styles.filterBadge} />
        </Pressable>
      </View>

      {!canSearch && !embedded ? (
        <EmptyState
          title="Où cherchez-vous ?"
          description="Choisissez une ville ou utilisez votre position, puis vos dates : chaque prix affiché sera un prix pour ces dates."
          action={<Button label="Choisir un lieu" onPress={() => setSheet("city")} />}
        />
      ) : null}
      {canSearch && search.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {search.isError ? (
        <EmptyState
          title="Recherche impossible"
          description="Vérifiez votre connexion."
          action={
            <Button label="Réessayer" variant="ghost" onPress={() => void search.refetch()} />
          }
        />
      ) : null}
      {canSearch && search.data ? (
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
                onPress={() => router.push(`/vehicules/${v.id}`)}
                onAction={() => setSelected(v)}
                favorite={fav.isFavorite(v.id)}
                onToggleFavorite={() => fav.toggle(v.id)}
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
          options={[{ value: "", label: "Toutes" }, ...ENABLED_CATEGORY_OPTIONS]}
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
        onMessage={() => {
          const v = selected;
          setSelected(null);
          if (!v) return;
          if (!session) {
            router.push("/(auth)/sign-in");
            return;
          }
          setContact({ organizationId: v.loueurId, name: v.loueurName, vehicleId: v.id });
        }}
      />
      {contact ? (
        <ContactSheet
          visible
          onClose={() => setContact(null)}
          organizationId={contact.organizationId}
          organizationName={contact.name}
          vehicleId={contact.vehicleId}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: theme.space["3"] },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["2"],
    minHeight: theme.touch.minTarget,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: fontFamily.medium,
    fontSize: theme.font.size.sm,
    paddingVertical: 8,
  },
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
  chipText: { flexShrink: 1 },
  chipOn: { borderColor: theme.colors.accent },
  place: { flex: 1 },
  dates: { flex: 1.35 },
  filters: { width: theme.touch.minTarget, paddingHorizontal: 0, justifyContent: "center" },
  filterBadge: { position: "absolute", top: -4, right: -4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space["3"],
  },
});
