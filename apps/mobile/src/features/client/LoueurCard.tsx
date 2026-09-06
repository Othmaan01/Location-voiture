import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, ChevronRight, ShieldCheck, Star } from "lucide-react-native";
import type { LoueurSummary } from "@lv/contracts";

import { Avatar, Badge, Text } from "@/components/ui";
import { formatEuros } from "@/features/pro/labels";
import { theme } from "@/theme";

/** Carte du feed (ADR-0009) : identite du loueur, 3 vignettes, "dès X €/j", lien vers le profil. */
export function LoueurCard({ loueur, onPress }: { loueur: LoueurSummary; onPress: () => void }) {
  const meta = [
    loueur.cityName,
    loueur.distanceKm != null ? `${loueur.distanceKm.toLocaleString("fr-FR")} km` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voir le loueur ${loueur.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.head}>
        <Avatar name={loueur.name} uri={loueur.logoUrl} size={44} />
        <View style={styles.headTexts}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
              {loueur.name}
            </Text>
            {loueur.verified ? (
              <Badge
                label="Vérifié"
                tone="accent"
                icon={<ShieldCheck size={12} color={theme.colors.accentTint} strokeWidth={2.5} />}
              />
            ) : null}
          </View>
          {meta ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {loueur.ratingAverage != null ? (
          <View style={styles.rating}>
            <Star size={13} color={theme.colors.text} fill={theme.colors.text} />
            <Text variant="smStrong">
              {loueur.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.thumbs}>
        {[0, 1, 2].map((i) => {
          const t = loueur.thumbnails[i];
          return t?.photoUrl ? (
            <Image
              key={t.id}
              source={{ uri: t.photoUrl }}
              style={styles.thumb}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View key={t?.id ?? `empty-${i}`} style={[styles.thumb, styles.thumbEmpty]}>
              {t ? <Car size={20} color={theme.colors.textDim} strokeWidth={1.5} /> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.foot}>
        <Text variant="sm" tone="muted">
          {loueur.vehicleCount} véhicule{loueur.vehicleCount > 1 ? "s" : ""}
          {loueur.fromDailyCents != null ? (
            <>
              {" · dès "}
              <Text variant="smStrong">{formatEuros(loueur.fromDailyCents)}/j</Text>
            </>
          ) : null}
        </Text>
        <View style={styles.cta}>
          <Text variant="smStrong" tone="accent">
            Voir le loueur
          </Text>
          <ChevronRight size={16} color={theme.colors.accentTint} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space["4"],
    gap: theme.space["3"],
  },
  pressed: { opacity: 0.92 },
  head: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  headTexts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: theme.space["2"] },
  name: { flexShrink: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  thumbs: { flexDirection: "row", gap: theme.space["2"] },
  thumb: { flex: 1, height: 78, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cta: { flexDirection: "row", alignItems: "center", gap: 2 },
});
