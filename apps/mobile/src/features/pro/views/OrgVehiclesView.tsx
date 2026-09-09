import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Car, LayoutGrid, List, Plus, Search, X } from "lucide-react-native";
import type { Vehicle } from "@lv/contracts";

import { Badge, Button, EmptyState, Screen, Text } from "@/components/ui";
import { CATEGORY_LABEL, formatEuros } from "@/features/pro/labels";
import { formatDate } from "@/features/client/booking-labels";
import { useOrgBookings } from "@/lib/queries-bookings";
import { useAgencies, useVehicles } from "@/lib/queries-catalog";
import { fontFamily, theme } from "@/theme";

type Layout = "list" | "cards";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** Filtre local : plaque, marque, modele, annee, version. « ab123 » retrouve « AB-123-CD ». */
function matches(v: Vehicle, query: string): boolean {
  const q = fold(query);
  if (!q) return true;
  const haystack = [v.brand, v.model, v.version, v.licensePlate, v.year ? String(v.year) : null]
    .filter((x): x is string => !!x)
    .map(fold);
  return haystack.some((h) => h.includes(q)) || fold(`${v.brand} ${v.model}`).includes(q);
}

/** Etat du jour : loue (retour a telle date) ou disponible, d'apres les reservations en cours. */
function rentalOf(
  vehicleId: string,
  active: Map<string, string>,
): { label: string; rented: boolean } {
  const returnAt = active.get(vehicleId);
  return returnAt
    ? { label: `Loué · retour le ${formatDate(returnAt)}`, rented: true }
    : { label: "Disponible", rented: false };
}

function statusOf(v: Vehicle): { label: string; tone: "success" | "accent" | "neutral" } {
  if (v.status === "published") return { label: "Publié", tone: "success" };
  if (v.suspendedAt) return { label: "Suspendu", tone: "accent" };
  return { label: "Brouillon", tone: "neutral" };
}

export function OrgVehiclesView({
  organizationId,
  embedded = false,
}: {
  organizationId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const vehicles = useVehicles(organizationId);
  const agencies = useAgencies(organizationId);
  const noAgency = agencies.data && agencies.data.agencies.length === 0;
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("list");
  const bookings = useOrgBookings(organizationId, "upcoming");
  const active = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, string>();
    for (const b of bookings.data?.bookings ?? []) {
      const inProgress =
        b.status === "active" ||
        (b.status === "confirmed" &&
          new Date(b.from).getTime() <= now &&
          new Date(b.to).getTime() > now);
      if (inProgress) map.set(b.vehicle.id, b.to);
    }
    return map;
  }, [bookings.data]);
  const all = vehicles.data?.vehicles ?? [];
  const shown = useMemo(() => all.filter((v) => matches(v, query)), [all, query]);
  const open = (id: string) => router.push(`/(pro)/organizations/${organizationId}/vehicles/${id}`);

  return (
    <Screen
      title="Véhicules"
      {...(embedded ? { dock: true } : { back: true })}
      headerRight={
        <Button
          label="Ajouter"
          size="sm"
          icon={<Plus size={18} color="#ffffff" />}
          disabled={!!noAgency}
          onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles/new`)}
        />
      }
    >
      {all.length > 0 ? (
        <View style={styles.toolbar}>
          <View style={styles.search}>
            <Search size={18} color={theme.colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Plaque, marque, modèle, année"
              placeholderTextColor={theme.colors.placeholder}
              style={styles.searchInput}
              autoCapitalize="characters"
              autoCorrect={false}
              clearButtonMode="never"
              returnKeyType="search"
              accessibilityLabel="Rechercher un véhicule"
            />
            {query ? (
              <Pressable
                onPress={() => setQuery("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer"
              >
                <X size={16} color={theme.colors.textDim} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.toggle}>
            {(
              [
                { key: "list", Icon: List, label: "Liste" },
                { key: "cards", Icon: LayoutGrid, label: "Grandes cartes" },
              ] as const
            ).map(({ key, Icon, label }) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: layout === key }}
                onPress={() => setLayout(key)}
                style={[styles.toggleItem, layout === key ? styles.toggleOn : null]}
              >
                <Icon size={18} color={layout === key ? "#ffffff" : theme.colors.textDim} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {vehicles.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {noAgency ? (
        <EmptyState
          title="Créez d'abord une agence"
          description="Chaque véhicule est rattaché à un point de retrait."
          action={
            <Button
              label="Créer une agence"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/agencies/new`)}
            />
          }
        />
      ) : vehicles.data && all.length === 0 ? (
        <EmptyState
          title="Aucun véhicule"
          description="Ajoutez votre premier véhicule : caractéristiques, photos, tarif."
          action={
            <Button
              label="Ajouter un véhicule"
              onPress={() => router.push(`/(pro)/organizations/${organizationId}/vehicles/new`)}
            />
          }
        />
      ) : null}
      {all.length > 0 && shown.length === 0 ? (
        <EmptyState
          title="Aucun véhicule ne correspond"
          description={`Rien pour « ${query} ». Essayez la plaque, la marque, le modèle ou l'année.`}
        />
      ) : null}

      {shown.length > 0 && layout === "list" ? (
        <View style={styles.rows}>
          {shown.map((v) => {
            const st = statusOf(v);
            const rental = rentalOf(v.id, active);
            return (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                onPress={() => open(v.id)}
                style={({ pressed }) => [styles.row, pressed ? styles.cardPressed : null]}
              >
                <Thumb vehicle={v} />
                <View style={styles.rowBody}>
                  <View style={styles.rowHead}>
                    <Text variant="bodyStrong" numberOfLines={1} style={styles.rowTitle}>
                      {v.brand} {v.model}
                    </Text>
                    <Badge label={st.label} tone={st.tone} />
                  </View>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {[v.year, v.licensePlate, CATEGORY_LABEL[v.category] ?? v.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  <View style={styles.rowFoot}>
                    <Text variant="smStrong">
                      {v.ratePlan
                        ? `${formatEuros(v.ratePlan.dailyCents)} / jour`
                        : "Tarif à définir"}
                    </Text>
                    <View
                      style={[styles.state, rental.rented ? styles.stateRented : styles.stateFree]}
                    >
                      <View
                        style={[
                          styles.stateDot,
                          {
                            backgroundColor: rental.rented
                              ? theme.colors.warning
                              : theme.colors.success,
                          },
                        ]}
                      />
                      <Text
                        variant="small"
                        tone={rental.rented ? "warning" : "success"}
                        numberOfLines={1}
                      >
                        {rental.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {shown.length > 0 && layout === "cards" ? (
        <View style={styles.grid}>
          {shown.map((v) => {
            const st = statusOf(v);
            const meta = [v.year, v.licensePlate].filter(Boolean).join(" · ");
            return (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                onPress={() => open(v.id)}
                style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
              >
                {v.photos[0] ? (
                  <Image
                    source={{ uri: v.photos[0].url }}
                    style={styles.cardPhoto}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.cardPhoto, styles.thumbEmpty]}>
                    <Car size={26} color={theme.colors.textDim} />
                  </View>
                )}
                <View style={styles.cardBadge}>
                  <Badge label={st.label} tone={st.tone} />
                </View>
                <View style={styles.cardBody}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {v.brand} {v.model}
                  </Text>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {meta || (CATEGORY_LABEL[v.category] ?? v.category)}
                  </Text>
                  <Text variant="smStrong">
                    {v.ratePlan
                      ? `${formatEuros(v.ratePlan.dailyCents)} / jour`
                      : "Tarif à définir"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {all.length > 0 ? (
        <Text variant="small" tone="dim">
          Un véhicule supprimé est archivé : son historique de réservations est conservé.
        </Text>
      ) : null}
    </Screen>
  );
}

function Thumb({ vehicle }: { vehicle: Vehicle }) {
  return vehicle.photos[0] ? (
    <Image
      source={{ uri: vehicle.photos[0].url }}
      style={styles.thumb}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty]}>
      <Car size={22} color={theme.colors.textDim} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", gap: theme.space["2"], alignItems: "center" },
  search: {
    flex: 1,
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
  toggle: {
    flexDirection: "row",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
  },
  toggleItem: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: theme.colors.accent },
  thumb: { width: 92, height: 69, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rows: { gap: theme.space["2"] },
  row: {
    flexDirection: "row",
    gap: theme.space["3"],
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowBody: { flex: 1, gap: 3, justifyContent: "center" },
  rowHead: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  rowTitle: { flex: 1 },
  rowFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space["2"],
  },
  state: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  stateFree: {},
  stateRented: {},
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["3"] },
  card: {
    width: "48%",
    flexGrow: 1,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.9 },
  cardPhoto: { width: "100%", aspectRatio: 4 / 3, backgroundColor: theme.colors.surfaceRaised },
  cardBody: { padding: theme.space["3"], gap: 2 },
  cardBadge: { position: "absolute", top: 8, left: 8 },
});
