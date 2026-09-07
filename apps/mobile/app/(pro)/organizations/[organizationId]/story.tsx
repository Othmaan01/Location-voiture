import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Images, Trash2, Video } from "lucide-react-native";
import { STORY_VIDEO_MAX_SECONDS } from "@lv/contracts";

import { Button, Card, EmptyState, Input, Screen, Text } from "@/components/ui";
import { ApiRequestError } from "@/lib/api";
import {
  useConfirmStory,
  useDeleteStory,
  useOrgStories,
  useStoryUploadUrl,
} from "@/lib/queries-stories";
import {
  UploadError,
  captureStoryMedia,
  pickAndPrepareImage,
  uploadToSignedUrl,
  type CapturedMedia,
} from "@/lib/upload";
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

  const publish = async (source: "camera" | "gallery") => {
    try {
      let media: CapturedMedia | null;
      if (source === "camera") media = await captureStoryMedia(STORY_VIDEO_MAX_SECONDS);
      else {
        const picked = await pickAndPrepareImage();
        media = picked ? { kind: "photo", ...picked } : null;
      }
      if (!media) return;
      setBusy(true);
      const signed = await uploadUrl.mutateAsync({
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
      });
      await uploadToSignedUrl(signed.uploadUrl, signed.token, media.uri, media.mimeType);
      await confirm.mutateAsync({
        path: signed.path,
        caption: caption.trim() || undefined,
        durationSeconds: media.kind === "video" ? media.durationSeconds : undefined,
      });
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
        Filmez ou photographiez en direct, ajoutez une phrase : visible 48 h dans les bulles du
        feed. La vidéo s'arrête toute seule au bout de {STORY_VIDEO_MAX_SECONDS} secondes. Vos
        offres et vos nouveaux véhicules y apparaissent déjà tout seuls.
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
          label="Filmer ou photographier"
          icon={<Camera size={18} color="#ffffff" />}
          onPress={() => void publish("camera")}
          loading={busy}
        />
        <Button
          label="Photo depuis la galerie"
          variant="ghost"
          icon={<Images size={18} color={theme.colors.text} />}
          onPress={() => void publish("gallery")}
          loading={busy}
        />
      </Card>

      {stories.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {stories.isSuccess && items.length === 0 ? (
        <EmptyState title="Aucune story en cours" description="Publiez-en une en 10 secondes." />
      ) : null}
      {items.map((s) => (
        <Card key={s.id} padded={false}>
          {s.mediaType === "video" ? (
            <View style={[styles.photo, styles.videoBox]}>
              <Video size={28} color={theme.colors.text} />
              <Text variant="small" tone="muted">
                Vidéo{s.durationSeconds ? ` · ${s.durationSeconds} s` : ""}
              </Text>
            </View>
          ) : (
            <Image source={{ uri: s.mediaUrl }} style={styles.photo} contentFit="cover" />
          )}
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
  videoBox: {
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceRaised,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["4"],
  },
  texts: { flex: 1, gap: 2 },
  trash: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
