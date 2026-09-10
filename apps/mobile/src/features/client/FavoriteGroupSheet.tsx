import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, FolderPlus, Heart } from "lucide-react-native";

import { Button, Input, Sheet, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import { useCreateFavoriteGroup, useFavorites, useSaveFavorite } from "@/lib/queries-public";
import { theme } from "@/theme";

import { useFavoriteChooser } from "./favorites";

/**
 * « Enregistrer dans… » : Favoris (sans groupe), les groupes existants, ou un nouveau groupe.
 * Un seul toucher enregistre et ferme. Montee a la racine, ouverte par n'importe quel coeur.
 */
export function FavoriteGroupSheet() {
  const vehicleId = useFavoriteChooser((s) => s.vehicleId);
  const close = useFavoriteChooser((s) => s.close);
  const favorites = useFavorites();
  const save = useSaveFavorite();
  const createGroup = useCreateFavoriteGroup();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  if (!vehicleId) return null;
  const current = favorites.data?.vehicles.find((v) => v.id === vehicleId);
  const groups = favorites.data?.groups ?? [];
  const busy = save.isPending || createGroup.isPending;

  const pick = (groupId: string | null) =>
    save.mutate(
      { vehicleId, groupId },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCreating(false);
          setName("");
          close();
        },
        onError: (e) =>
          Alert.alert(
            "Enregistrement impossible",
            e instanceof ApiRequestError ? e.message : "Réessayez.",
          ),
      },
    );
  const createAndPick = () =>
    createGroup.mutate(name.trim(), {
      onSuccess: (g) => pick(g.id),
      onError: (e) =>
        Alert.alert("Groupe non créé", e instanceof ApiRequestError ? e.message : "Réessayez."),
    });

  return (
    <Sheet visible onClose={close} title={current ? "Ranger dans" : "Enregistrer dans"}>
      <View style={styles.list}>
        <Row
          icon={<Heart size={18} color={theme.colors.text} />}
          label="Favoris"
          hint="Sans groupe"
          selected={!!current && current.groupId === null}
          onPress={() => pick(null)}
          disabled={busy}
        />
        {groups.map((g) => (
          <Row
            key={g.id}
            icon={
              <Text variant="smStrong" tone="muted">
                {g.count}
              </Text>
            }
            label={g.name}
            hint={`${g.count} véhicule${g.count > 1 ? "s" : ""}`}
            selected={current?.groupId === g.id}
            onPress={() => pick(g.id)}
            disabled={busy}
          />
        ))}
      </View>
      {creating ? (
        <View style={styles.create}>
          <Input
            label="Nom du groupe"
            value={name}
            onChangeText={setName}
            placeholder="Mariage Mejdi 2027"
            maxLength={40}
            autoFocus
          />
          <Button
            label="Créer et enregistrer"
            disabled={name.trim().length === 0}
            loading={busy}
            onPress={createAndPick}
          />
        </View>
      ) : (
        <Button
          label="Nouveau groupe"
          variant="ghost"
          icon={<FolderPlus size={18} color={theme.colors.text} />}
          onPress={() => setCreating(true)}
        />
      )}
      {busy && !creating ? <ActivityIndicator color={theme.colors.accent} /> : null}
    </Sheet>
  );
}

function Row({
  icon,
  label,
  hint,
  selected,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      </View>
      {selected ? <Check size={18} color={theme.colors.accentTint} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["3"],
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  create: { gap: theme.space["3"] },
});
