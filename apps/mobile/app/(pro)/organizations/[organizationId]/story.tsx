import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Trash2 } from "lucide-react-native";

import { Button, Card, EmptyState, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import {
  useConfirmStory,
  useDeleteStory,
  useOrgStories,
  useStoryUploadUrl,
} from "@/lib/queries-stories";
import { UploadError, pickAndPrepareImage, uploadToSignedUrl } from "@/lib/upload";
import { theme } from "@/theme";

/** Story du loueur (ADR-0016) : une photo et une legende, visibles 48 h dans les bulles du feed. */
export default function StoryScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const stories = useOrgStories(organizationId);
  const uploadUrl = useStoryUploadUrl(organizationId);
  const confirm = useConfirmStory(organizationId);
  const remove = useDeleteStory(organizationId);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    try {
      const picked = await pickAndPrepareImage();
      if (!picked) return;
      setBusy(true);
      const signed = await uploadUrl.mutateAsync({
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, picked.uri, picked.mimeType);
      await confirm.mutateAsync({ path: signed.path, caption: caption.trim() || undefined });
      setCaption("");
    } catch (e) {
      Alert.alert(
        "Story non publiée",
        e instanceof ApiRequestError || e instanceof UploadError
          ? e.message
          : "Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (id: string) =>
    Alert.alert("Retirer cette story ?", "Elle disparaîtra immédiatement des bulles.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: () =>
          remove.mutate(id, {
            onError: (e) =>
              Alert.alert("Impossible", e instanceof ApiRequestError ? e.message : "Réessayez."),
          }),
      },
    ]);

  const items = stories.data?.stories ?? [];
  return (
    <Screen title="Story" back>
      <Text variant="sm" tone="muted">
        Une photo, une phrase, visible 48 h dans les bulles en haut du feed. Vos offres et vos
        nouveaux véhicules y apparaissent déjà tout seuls.
      </Text>
      <Card>
        <Input
          label="Légende (facultatif)"
          value={caption}
          onChangeText={setCaption}
          placeholder="Ex. Week-end à -20 % sur la Clio"
          maxLength={120}
        />
        <Button
          label="Choisir une photo et publier"
          icon={<Camera size={18} color="#ffffff" />}
          onPress={() => void publish()}
          loading={busy}
        />
      </Card>

      {stories.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {stories.isSuccess && items.length === 0 ? (
        <EmptyState title="Aucune story en cours" description="Publiez-en une en 10 secondes." />
      ) : null}
      {items.map((s) => (
        <Card key={s.id} padded={false}>
          <Image source={{ uri: s.photoUrl }} style={styles.photo} contentFit="cover" />
          <View style={styles.row}>
            <View style={styles.texts}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {s.caption ?? "Sans légende"}
              </Text>
              <Text variant="small" tone="muted">
                Expire {expiresLabel(s.expiresAt)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer la story"
              onPress={() => confirmRemove(s.id)}
              hitSlop={8}
              style={styles.trash}
            >
              <Trash2 size={20} color={theme.colors.danger} />
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function expiresLabel(iso: string): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
  return hours < 1 ? "dans moins d'une heure" : `dans ${hours} h`;
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 4 / 5, maxHeight: 320 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["4"],
  },
  texts: { flex: 1, gap: 2 },
  trash: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
