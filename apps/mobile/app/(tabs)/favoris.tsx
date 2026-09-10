import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { FolderPlus } from "lucide-react-native";

import { Button, CountBadge, EmptyState, Input, Screen, Sheet, Text } from "@/components/ui";
import { VehicleCard } from "@/features/client/VehicleCard";
import { useFavoriteAction } from "@/features/client/favorites";
import { ApiRequestError } from "@/lib/api";
import {
  useCreateFavoriteGroup,
  useDeleteFavoriteGroup,
  useFavorites,
  useRenameFavoriteGroup,
} from "@/lib/queries-public";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

/**
 * Favoris avec groupes (retour fondateur, 2026-09-10) : « Tous », puis un groupe par projet
 * (« Mariage Mejdi 2027 »). Le coeur retire, le « + » range dans un groupe ; appui long sur
 * un groupe pour le renommer ou le supprimer (ses favoris restent).
 */
export default function FavoritesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const favorites = useFavorites();
  const fav = useFavoriteAction();
  const createGroup = useCreateFavoriteGroup();
  const renameGroup = useRenameFavoriteGroup();
  const deleteGroup = useDeleteFavoriteGroup();
  const [group, setGroup] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: string | null; name: string } | null>(null);
  const groups = favorites.data?.groups ?? [];
  const all = favorites.data?.vehicles ?? [];
  const shown = group ? all.filter((v) => v.groupId === group) : all;
  const selectedGroup = groups.find((g) => g.id === group) ?? null;

  const submitEditor = () => {
    if (!editor) return;
    const name = editor.name.trim();
    const onError = (e: unknown) =>
      Alert.alert("Groupe non enregistré", e instanceof ApiRequestError ? e.message : "Réessayez.");
    if (editor.id)
      renameGroup.mutate(
        { groupId: editor.id, name },
        { onSuccess: () => setEditor(null), onError },
      );
    else
      createGroup.mutate(name, {
        onSuccess: (g) => {
          setEditor(null);
          setGroup(g.id);
        },
        onError,
      });
  };
  const manage = (g: { id: string; name: string }) =>
    Alert.alert(g.name, undefined, [
      { text: "Renommer", onPress: () => setEditor({ id: g.id, name: g.name }) },
      {
        text: "Supprimer le groupe",
        style: "destructive",
        onPress: () =>
          deleteGroup.mutate(g.id, {
            onSuccess: () => {
              if (group === g.id) setGroup(null);
            },
          }),
      },
      { text: "Annuler", style: "cancel" },
    ]);

  return (
    <Screen title="Favoris" dock>
      {!session ? (
        <EmptyState
          title="Vos favoris vous attendent"
          description="Connectez-vous pour retrouver les véhicules enregistrés sur tous vos appareils."
          action={<Button label="Se connecter" onPress={() => router.push("/(auth)/sign-in")} />}
        />
      ) : null}
      {session && favorites.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {session && favorites.data ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groups}
        >
          <Chip
            label="Tous"
            count={all.length}
            selected={group === null}
            onPress={() => setGroup(null)}
          />
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              count={g.count}
              selected={group === g.id}
              onPress={() => setGroup(g.id)}
              onLongPress={() => manage(g)}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nouveau groupe"
            onPress={() => setEditor({ id: null, name: "" })}
            style={[styles.chip, styles.chipNew]}
          >
            <FolderPlus size={16} color={theme.colors.text} />
            <Text variant="smStrong">Nouveau groupe</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      {favorites.data && all.length === 0 ? (
        <EmptyState
          title="Aucun favori"
          description="Touchez le cœur sur un véhicule pour le retrouver ici, puis rangez-le dans un groupe."
          action={
            <Button label="Explorer" variant="ghost" onPress={() => router.navigate("/(tabs)")} />
          }
        />
      ) : null}
      {favorites.data && all.length > 0 && shown.length === 0 ? (
        <EmptyState
          title={`Rien dans « ${selectedGroup?.name ?? "ce groupe"} »`}
          description="Touchez le + d'un favori pour le ranger ici."
        />
      ) : null}
      {shown.length > 0 ? (
        <View style={styles.grid}>
          {shown.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onPress={() => router.push(`/vehicules/${v.id}`)}
              favorite
              onToggleFavorite={() => fav.toggle(v.id)}
              onAction={() => fav.move(v.id)}
            />
          ))}
        </View>
      ) : null}
      {editor ? (
        <Sheet
          visible
          onClose={() => setEditor(null)}
          title={editor.id ? "Renommer le groupe" : "Nouveau groupe"}
        >
          <Input
            label="Nom"
            value={editor.name}
            onChangeText={(name) => setEditor({ ...editor, name })}
            placeholder="Mariage Mejdi 2027"
            maxLength={40}
            autoFocus
          />
          <Button
            label={editor.id ? "Renommer" : "Créer le groupe"}
            disabled={editor.name.trim().length === 0}
            loading={createGroup.isPending || renameGroup.isPending}
            onPress={submitEditor}
          />
        </Sheet>
      ) : null}
    </Screen>
  );
}

function Chip({
  label,
  count,
  selected,
  onPress,
  onLongPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={onLongPress}
      style={[styles.chip, selected ? styles.chipOn : null]}
    >
      <Text variant="smStrong" tone={selected ? "inverse" : "default"} numberOfLines={1}>
        {label}
      </Text>
      <CountBadge count={count} inverted={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groups: { gap: theme.space["2"], paddingRight: theme.space["4"] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: theme.space["3"],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipOn: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  chipNew: { borderStyle: "dashed", backgroundColor: "transparent" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space["3"],
  },
});
