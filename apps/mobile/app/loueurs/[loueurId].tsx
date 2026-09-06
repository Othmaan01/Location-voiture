import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Globe, MapPin, Phone, ShieldCheck } from "lucide-react-native";
import type { PublicVehicleCard } from "@lv/contracts";

import { Avatar, Badge, Button, EmptyState, Screen, Text } from "@/components/ui";
import { VehicleActionSheet } from "@/features/client/VehicleActionSheet";
import { VehicleCard } from "@/features/client/VehicleCard";
import { ACCENT_COLOR } from "@/features/client/accent";
import { formatPeriod, useSearchState } from "@/features/client/search-state";
import { useFavorites, useLoueur, useToggleFavorite } from "@/lib/queries-public";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/** Profil public d'un loueur : en-tete, contact, itineraire, grille des vehicules avec bouton d'action (ADR-0009). */
export default function LoueurScreen() {
  const { loueurId } = useLocalSearchParams<{ loueurId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { from, to } = useSearchState();
  const period = from && to ? { from, to } : null;
  const loueur = useLoueur(loueurId, period);
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const [selected, setSelected] = useState<PublicVehicleCard | null>(null);
  const [tab, setTab] = useState<"vehicles" | "info">("vehicles");

  if (loueur.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (loueur.isError || !loueur.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState
          title="Loueur introuvable"
          description="Il n'est plus disponible sur l'application."
        />
      </Screen>
    );
  }
  const l = loueur.data;
  const accent = ACCENT_COLOR[l.accent];
  const mainAgency = l.agencies[0] ?? null;
  const favSet = new Set(favorites.data?.vehicles.map((v) => v.id) ?? []);
  const call = () =>
    mainAgency?.phone
      ? void Linking.openURL(`tel:${mainAgency.phone.replace(/\s/g, "")}`)
      : Alert.alert("Contact", "Ce loueur n'a pas renseigné de téléphone.");
  const directions = () => {
    if (!mainAgency || mainAgency.latitude === null || mainAgency.longitude === null) return;
    void Linking.openURL(
      `https://maps.apple.com/?daddr=${mainAgency.latitude},${mainAgency.longitude}`,
    );
  };
  const onToggleFavorite = (vehicleId: string) => {
    if (!session) {
      router.push("/(auth)/sign-in");
      return;
    }
    toggle.mutate({ vehicleId, on: !favSet.has(vehicleId) });
  };

  return (
    <Screen back>
      {l.bannerUrl ? (
        <Image source={{ uri: l.bannerUrl }} style={styles.banner} contentFit="cover" />
      ) : (
        <View style={[styles.banner, styles.bannerEmpty, { borderColor: accent }]} />
      )}
      <View style={styles.head}>
        <View style={[styles.logoRing, { borderColor: accent }]}>
          <Avatar name={l.name} uri={l.logoUrl} size={64} />
        </View>
        <View style={styles.headTexts}>
          <View style={styles.nameRow}>
            <Text variant="h1" style={styles.name}>
              {l.name}
            </Text>
            {l.verified ? (
              <Badge
                label="Vérifié"
                tone="accent"
                icon={<ShieldCheck size={12} color={theme.colors.accentTint} strokeWidth={2.5} />}
              />
            ) : null}
          </View>
          {mainAgency ? (
            <Text variant="small" tone="muted">
              {[mainAgency.addressLine, mainAgency.cityName].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
      {l.bio ? (
        <Text variant="sm" tone="muted">
          {l.bio}
        </Text>
      ) : null}
      <View style={styles.stats}>
        <Stat
          value={String(l.vehicleCount)}
          label={l.vehicleCount > 1 ? "véhicules" : "véhicule"}
        />
        <Stat
          value={
            l.ratingAverage != null
              ? l.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })
              : "—"
          }
          label={l.ratingCount > 0 ? `${l.ratingCount} avis` : "pas encore d'avis"}
        />
        <Stat
          value={l.responseRate != null ? `${Math.round(l.responseRate * 100)} %` : "—"}
          label="réponses"
        />
        <Stat value={new Date(l.memberSince).getFullYear().toString()} label="membre depuis" />
      </View>
      <View style={styles.actions}>
        <Button
          label="Contacter"
          variant="primary"
          icon={<Phone size={18} color={theme.colors.textInverse} strokeWidth={2} />}
          style={styles.flex}
          onPress={call}
        />
        <Button
          label="Itinéraire"
          variant="ghost"
          icon={<MapPin size={18} color={theme.colors.text} strokeWidth={2} />}
          style={styles.flex}
          onPress={directions}
        />
      </View>
      <View style={styles.tabs}>
        {(["vehicles", "info"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t ? styles.tabOn : null]}
          >
            <Text variant="smStrong" tone={tab === t ? "default" : "dim"}>
              {t === "vehicles" ? "Véhicules" : "Infos"}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "vehicles" ? (
        <>
          {period ? (
            <Text variant="small" tone="muted">
              Disponibilité pour {formatPeriod(from, to)}. Changez les dates dans Explorer.
            </Text>
          ) : null}
          <View style={styles.grid}>
            {l.vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onPress={() => setSelected(v)}
                onAction={() => setSelected(v)}
                favorite={favSet.has(v.id)}
                onToggleFavorite={() => onToggleFavorite(v.id)}
              />
            ))}
          </View>
          {l.vehicles.length === 0 ? <EmptyState title="Aucun véhicule publié" /> : null}
        </>
      ) : (
        <View style={styles.info}>
          {l.website ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(l.website!)}
              style={styles.website}
            >
              <Globe size={16} color={theme.colors.accentTint} />
              <Text variant="smStrong" tone="accent" numberOfLines={1}>
                {l.website.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          ) : null}
          {l.agencies.map((a) => (
            <View key={a.id} style={styles.agency}>
              {a.photoUrl ? (
                <Image source={{ uri: a.photoUrl }} style={styles.agencyPhoto} contentFit="cover" />
              ) : null}
              <Text variant="bodyStrong">{a.name}</Text>
              {a.description ? (
                <Text variant="sm" tone="muted">
                  {a.description}
                </Text>
              ) : null}
              <Text variant="sm" tone="muted">
                {[a.addressLine, [a.postalCode, a.cityName].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {a.phone ? (
                <Text variant="sm" tone="muted">
                  {a.phone}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
      <VehicleActionSheet
        vehicle={selected}
        loueurName={l.name}
        phone={mainAgency?.phone ?? null}
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 120, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface },
  bannerEmpty: { borderWidth: 1, opacity: 0.6 },
  logoRing: { borderWidth: 2, borderRadius: 20, padding: 2 },
  website: { flexDirection: "row", alignItems: "center", gap: theme.space["2"], minHeight: 40 },
  agencyPhoto: { height: 110, borderRadius: 10, marginBottom: theme.space["2"] },
  head: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  headTexts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: theme.space["2"], flexWrap: "wrap" },
  name: { flexShrink: 1 },
  stats: { flexDirection: "row", gap: theme.space["4"] },
  stat: { gap: 0 },
  actions: { flexDirection: "row", gap: theme.space["2"] },
  flex: { flex: 1, minHeight: 46 },
  tabs: {
    flexDirection: "row",
    gap: theme.space["4"],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minHeight: theme.touch.minTarget,
    justifyContent: "flex-end",
  },
  tabOn: { borderBottomColor: theme.colors.accent },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space["3"],
  },
  info: { gap: theme.space["3"] },
  agency: {
    gap: 2,
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
