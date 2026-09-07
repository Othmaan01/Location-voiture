import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Car, Heart, Plus, Tag } from "lucide-react-native";
import type { PublicVehicleCard } from "@lv/contracts";

import { Text } from "@/components/ui";
import { CATEGORY_LABEL, TRANSMISSION_LABEL, formatEuros } from "@/features/pro/labels";
import { formatOffer } from "@/lib/queries-offers";
import { theme } from "@/theme";

interface Props {
  vehicle: PublicVehicleCard & { totalCents?: number | null; days?: number | null };
  onPress: () => void;
  onAction?: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

/** Carte vehicule de la grille (ADR-0009) : photo, nom, prix, petit bouton d'action rouge. */
export function VehicleCard({ vehicle, onPress, onAction, favorite, onToggleFavorite }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.brand} ${vehicle.model}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      {vehicle.photoUrl ? (
        <Image
          source={{ uri: vehicle.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Car size={30} color={theme.colors.textDim} strokeWidth={1.5} />
        </View>
      )}
      {vehicle.offer ? (
        <View style={styles.offerBadge}>
          <Tag size={11} color="#ffffff" strokeWidth={2.5} />
          <Text variant="small" style={styles.offerText}>
            {formatOffer(vehicle.offer)}
          </Text>
        </View>
      ) : null}
      {vehicle.available === false ? (
        <View style={[styles.unavailable, vehicle.offer ? styles.unavailableBelow : null]}>
          <Text variant="small" style={styles.unavailableText}>
            Indisponible à ces dates
          </Text>
        </View>
      ) : null}
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          onPress={onToggleFavorite}
          hitSlop={8}
          style={styles.heart}
        >
          <Heart
            size={18}
            color={favorite ? theme.colors.accentTint : "#ffffff"}
            fill={favorite ? theme.colors.accentTint : "transparent"}
          />
        </Pressable>
      ) : null}
      <View style={styles.body}>
        <Text variant="smStrong" numberOfLines={1}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={1}>
          {[
            vehicle.version,
            TRANSMISSION_LABEL[vehicle.transmission],
            CATEGORY_LABEL[vehicle.category],
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <View style={styles.priceRow}>
          {vehicle.totalCents != null && vehicle.days ? (
            <Text variant="bodyStrong">
              {formatEuros(vehicle.totalCents)}{" "}
              <Text variant="small" tone="muted">
                · {vehicle.days} j
              </Text>
            </Text>
          ) : vehicle.dailyCents != null && vehicle.discountedDailyCents != null ? (
            <Text variant="bodyStrong">
              <Text variant="small" tone="dim" style={styles.struck}>
                {formatEuros(vehicle.dailyCents)}
              </Text>{" "}
              {formatEuros(vehicle.discountedDailyCents)}{" "}
              <Text variant="small" tone="muted">
                / jour
              </Text>
            </Text>
          ) : vehicle.dailyCents != null ? (
            <Text variant="bodyStrong">
              {formatEuros(vehicle.dailyCents)}{" "}
              <Text variant="small" tone="muted">
                / jour
              </Text>
            </Text>
          ) : (
            <Text variant="small" tone="muted">
              Prix sur demande
            </Text>
          )}
        </View>
      </View>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demander une réservation ou contacter le loueur"
          onPress={onAction}
          hitSlop={6}
          style={styles.action}
        >
          <Plus size={18} color="#ffffff" strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  pressed: { opacity: 0.9 },
  photo: { width: "100%", aspectRatio: 4 / 3, backgroundColor: theme.colors.surfaceRaised },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  unavailable: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(8,8,10,0.75)",
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unavailableText: { color: theme.colors.text },
  unavailableBelow: { top: 36 },
  offerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerText: { color: "#ffffff", fontWeight: "700" },
  struck: { textDecorationLine: "line-through" },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(8,8,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: theme.space["3"], paddingBottom: theme.space["3"] + 24, gap: 2 },
  priceRow: { marginTop: 4 },
  action: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadow.red.color,
    shadowOpacity: theme.shadow.red.opacity,
    shadowRadius: theme.shadow.red.radius,
    shadowOffset: { width: 0, height: theme.shadow.red.offsetY },
  },
});
